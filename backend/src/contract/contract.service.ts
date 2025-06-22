import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ContractData } from './contract.controller';

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  /**
   * Contractデータを投入（既存データに追加/更新）
   */
  async importContracts(contractsData: ContractData[]) {
    const results = {
      imported: 0,
      updated: 0,
      errors: []
    };

    for (const contractData of contractsData) {
      try {
        // empNoでStaffを検索してstaffIdを自動マッピング
        const staff = await this.prisma.staff.findUnique({
          where: { empNo: contractData.empNo }
        });

        if (!staff) {
          results.errors.push({
            empNo: contractData.empNo,
            error: `社員番号 ${contractData.empNo} に対応するスタッフが見つかりません`
          });
          continue;
        }

        // 既存のContractデータをチェック
        const existingContract = await this.prisma.contract.findUnique({
          where: { empNo: contractData.empNo }
        });

        if (existingContract) {
          // 既存データを更新
          await this.prisma.contract.update({
            where: { empNo: contractData.empNo },
            data: {
              name: contractData.name,
              department: contractData.dept,
              team: contractData.team,
              email: contractData.email,
              mondayHours: contractData.mondayHours,
              tuesdayHours: contractData.tuesdayHours,
              wednesdayHours: contractData.wednesdayHours,
              thursdayHours: contractData.thursdayHours,
              fridayHours: contractData.fridayHours,
              saturdayHours: contractData.saturdayHours,
              sundayHours: contractData.sundayHours,
              staffId: staff.id
            }
          });
          results.updated++;
        } else {
          // 新規データを作成
          await this.prisma.contract.create({
            data: {
              empNo: contractData.empNo,
              name: contractData.name,
              department: contractData.dept,
              team: contractData.team,
              email: contractData.email,
              mondayHours: contractData.mondayHours,
              tuesdayHours: contractData.tuesdayHours,
              wednesdayHours: contractData.wednesdayHours,
              thursdayHours: contractData.thursdayHours,
              fridayHours: contractData.fridayHours,
              saturdayHours: contractData.saturdayHours,
              sundayHours: contractData.sundayHours,
              staffId: staff.id
            }
          });
          results.imported++;
        }
      } catch (error) {
        results.errors.push({
          empNo: contractData.empNo,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 洗い替え前の影響範囲を分析
   */
  async analyzeReplaceImpact() {
    const impactAnalysis = await this.prisma.$transaction(async (tx) => {
      // 現在のContract件数
      const contractCount = await tx.contract.count();
      
      // 関連する月次スケジュール件数
      const monthlyScheduleCount = await tx.monthlySchedule.count({
        where: {
          staff: {
            contracts: {
              some: {}
            }
          }
        }
      });
      
      // 関連する個別調整件数  
      const adjustmentCount = await tx.adjustment.count({
        where: {
          staff: {
            contracts: {
              some: {}
            }
          }
        }
      });
      
      return {
        contractCount,
        monthlyScheduleCount,
        adjustmentCount
      };
    });
    
    return {
      message: "洗い替え影響範囲分析",
      impact: impactAnalysis,
      warning: "洗い替え実行により、既存の月次・個別スケジュールとの整合性に注意が必要です"
    };
  }

  /**
   * 全Contractデータを洗い替え（既存データを全削除してから新規投入）
   */
  async replaceContracts(contractsData: ContractData[], options: {
    deleteRelatedSchedules?: boolean;
    forceReplace?: boolean;
  } = {}) {
    // 影響範囲分析
    const impact = await this.analyzeReplaceImpact();
    
    if (!options.forceReplace && (impact.impact.monthlyScheduleCount > 0 || impact.impact.adjustmentCount > 0)) {
      throw new Error(`洗い替えにより${impact.impact.monthlyScheduleCount}件の月次スケジュール、${impact.impact.adjustmentCount}件の個別調整に影響します。forceReplace=trueで強制実行可能です。`);
    }

    return await this.prisma.$transaction(async (tx) => {
      // オプションで関連スケジュールも削除
      if (options.deleteRelatedSchedules) {
        await tx.adjustment.deleteMany({
          where: {
            staff: {
              contracts: { some: {} }
            }
          }
        });
        
        await tx.monthlySchedule.deleteMany({
          where: {
            staff: {
              contracts: { some: {} }
            }
          }
        });
      }

      // 既存の全Contractデータを削除
      const deletedCount = await tx.contract.deleteMany({});

      // 新規データを投入（トランザクション内で）
      const results = {
        imported: 0,
        updated: 0,
        errors: []
      };

      for (const contractData of contractsData) {
        try {
          const staff = await tx.staff.findUnique({
            where: { empNo: contractData.empNo }
          });

          if (!staff) {
            results.errors.push({
              empNo: contractData.empNo,
              error: `社員番号 ${contractData.empNo} に対応するスタッフが見つかりません`
            });
            continue;
          }

          await tx.contract.create({
            data: {
              empNo: contractData.empNo,
              name: contractData.name,
              department: contractData.dept,
              team: contractData.team,
              email: contractData.email,
              mondayHours: contractData.mondayHours,
              tuesdayHours: contractData.tuesdayHours,
              wednesdayHours: contractData.wednesdayHours,
              thursdayHours: contractData.thursdayHours,
              fridayHours: contractData.fridayHours,
              saturdayHours: contractData.saturdayHours,
              sundayHours: contractData.sundayHours,
              staffId: staff.id
            }
          });
          results.imported++;
        } catch (error) {
          results.errors.push({
            empNo: contractData.empNo,
            error: error.message
          });
        }
      }

      return {
        deleted: deletedCount.count,
        imported: results.imported,
        updated: 0,
        errors: results.errors,
        schedulesCleaned: options.deleteRelatedSchedules
      };
    });
  }

  /**
   * empNoの存在チェック
   */
  async validateEmpNos(empNos: string[]) {
    const existingStaff = await this.prisma.staff.findMany({
      where: {
        empNo: {
          in: empNos
        }
      },
      select: { empNo: true, name: true }
    });

    const existingEmpNos = existingStaff.map(s => s.empNo);
    const missingEmpNos = empNos.filter(empNo => !existingEmpNos.includes(empNo));

    return {
      existing: existingStaff,
      missing: missingEmpNos
    };
  }
}