import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DailyAssignmentsService {
  constructor(private prisma: PrismaService) {}

  async getAssignmentsByDate(date: string) {
    // 担当設定データを取得
    const dailyAssignments = await this.prisma.dailyAssignment.findMany({
      where: {
        date: new Date(date)
      },
      include: {
        Staff: {
          select: {
            id: true,
            empNo: true,
            name: true,
            department: true,
            group: true
          }
        }
      }
    });

    // 支援設定データを取得（日付範囲でフィルタ）
    const targetDate = new Date(date);
    const temporaryAssignments = await this.prisma.temporaryAssignment.findMany({
      where: {
        isActive: true,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      },
      include: {
        Staff: {
          select: {
            id: true,
            empNo: true,
            name: true,
            department: true,
            group: true
          }
        }
      }
    });

    return {
      assignments: [
        // 担当設定データ
        ...dailyAssignments.map(a => ({
          id: a.id,
          staffId: a.staffId,
          staffName: a.Staff.name,
          assignmentType: a.assignmentType,
          customLabel: a.customLabel,
          date: a.date,
          type: 'daily' as const
        })),
        // 支援設定データ
        ...temporaryAssignments.map(t => ({
          id: t.id,
          staffId: t.staffId,
          staffName: t.Staff.name,
          tempDept: t.tempDept,
          tempGroup: t.tempGroup,
          startDate: t.startDate,
          endDate: t.endDate,
          reason: t.reason,
          type: 'temporary' as const
        }))
      ]
    };
  }

  async upsertAssignment(data: {
    staffId: number;
    date: string;
    assignmentType: string;
    customLabel?: string;
  }) {
    // 既存のレコードがあるかチェック
    const existing = await this.prisma.dailyAssignment.findFirst({
      where: {
        staffId: data.staffId,
        date: new Date(data.date),
        assignmentType: data.assignmentType
      }
    });

    if (existing) {
      // 更新
      const result = await this.prisma.dailyAssignment.update({
        where: { id: existing.id },
        data: {
          customLabel: data.customLabel || null,
          updatedAt: new Date()
        }
      });
      return result;
    } else {
      // 新規作成
      const result = await this.prisma.dailyAssignment.create({
        data: {
          staffId: data.staffId,
          date: new Date(data.date),
          assignmentType: data.assignmentType,
          customLabel: data.customLabel || null,
          updatedAt: new Date()
        }
      });
      return result;
    }
  }

  async upsertSupportAssignment(data: {
    staffId: number;
    startDate?: string;
    endDate?: string;
    tempDept?: string;
    tempGroup?: string;
  }) {
    console.log('Support assignment data received:', data);
    
    try {
      // 既存の同一期間支援設定を確認・削除
      const existingAssignment = await this.prisma.temporaryAssignment.findFirst({
        where: {
          staffId: data.staffId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate)
        }
      });

      if (existingAssignment) {
        console.log('Existing assignment found, deleting:', existingAssignment.id);
        await this.prisma.temporaryAssignment.delete({
          where: { id: existingAssignment.id }
        });
      }

      // 他のアクティブな支援設定を無効化
      await this.prisma.temporaryAssignment.updateMany({
        where: { 
          staffId: data.staffId,
          isActive: true 
        },
        data: { isActive: false }
      });

      // 新しい支援設定を作成
      const result = await this.prisma.temporaryAssignment.create({
        data: {
          staffId: data.staffId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          tempDept: data.tempDept || '',
          tempGroup: data.tempGroup || '',
          reason: '支援設定',
          isActive: true,
          updatedAt: new Date()
        } as any
      });
      
      console.log('Support assignment created:', result);
      return { success: true, assignment: result };
    } catch (error) {
      console.error('Support assignment error:', error);
      console.error('Error details:', error.message, error.code);
      throw new Error(`支援設定の保存に失敗しました: ${error.message}`);
    }
  }

  async deleteAssignment(staffId: number, date: string) {
    try {
      const result = await this.prisma.dailyAssignment.deleteMany({
        where: {
          staffId,
          date: new Date(date)
        }
      });
      return { success: true, deletedCount: result.count };
    } catch (error) {
      if (error.code === 'P2025') {
        return { success: false, message: '担当設定が見つかりません' };
      }
      throw error;
    }
  }

  async deleteSupportAssignment(staffId: number) {
    console.log('Support assignment deletion for staffId:', staffId);
    
    try {
      // アクティブな支援設定を無効化（論理削除）
      const result = await this.prisma.temporaryAssignment.updateMany({
        where: { 
          staffId: staffId,
          isActive: true 
        },
        data: { 
          isActive: false 
        }
      });
      
      console.log('Support assignment deleted:', result);
      return { success: true, deletedCount: result.count };
    } catch (error) {
      console.error('Support assignment deletion error:', error);
      console.error('Error details:', error.message, error.code);
      throw new Error(`支援設定の削除に失敗しました: ${error.message}`);
    }
  }
}