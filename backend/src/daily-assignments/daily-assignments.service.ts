import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateDailyAssignmentDto {
  staffId: number;
  date: string; // YYYY-MM-DD
  assignmentType: 'CS' | 'FAX' | 'CUSTOM';
  customLabel?: string;
}

export interface UpdateDailyAssignmentDto {
  assignmentType?: 'CS' | 'FAX' | 'CUSTOM';
  customLabel?: string;
}

@Injectable()
export class DailyAssignmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 指定日の全スタッフの担当状況を取得
   */
  async getDailyAssignmentsByDate(date: string) {
    const targetDate = new Date(date);
    
    // 一次受付サポート課の全スタッフを取得
    const receptionStaff = await this.prisma.staff.findMany({
      where: { 
        department: '一次受付サポート課' 
      },
      include: {
        dailyAssignments: {
          where: {
            date: targetDate
          }
        }
      }
    });

    return receptionStaff.map(staff => {
      const assignment = staff.dailyAssignments[0];
      return {
        id: staff.id,
        name: staff.name,
        department: staff.department,
        group: staff.group,
        assignment: assignment ? {
          assignmentType: assignment.assignmentType,
          customLabel: assignment.customLabel
        } : null
      };
    });
  }

  /**
   * 担当設定を作成または更新
   */
  async createOrUpdateDailyAssignment(createDto: CreateDailyAssignmentDto) {
    const targetDate = new Date(createDto.date);

    // バリデーション: カスタムタイプの場合はラベル必須
    if (createDto.assignmentType === 'CUSTOM' && !createDto.customLabel) {
      throw new Error('カスタム担当の場合はラベルが必要です');
    }

    // upsert を使用して作成または更新
    return this.prisma.dailyAssignment.upsert({
      where: {
        staffId_date: {
          staffId: createDto.staffId,
          date: targetDate
        }
      },
      update: {
        assignmentType: createDto.assignmentType,
        customLabel: createDto.customLabel
      },
      create: {
        staffId: createDto.staffId,
        date: targetDate,
        assignmentType: createDto.assignmentType,
        customLabel: createDto.customLabel
      },
      include: {
        staff: {
          select: { id: true, name: true, department: true, group: true }
        }
      }
    });
  }

  /**
   * 担当設定を削除
   */
  async removeDailyAssignment(staffId: number, date: string) {
    const targetDate = new Date(date);
    
    return this.prisma.dailyAssignment.deleteMany({
      where: {
        staffId,
        date: targetDate
      }
    });
  }

  /**
   * スタッフの担当履歴を取得
   */
  async getStaffAssignmentHistory(staffId: number, limit = 30) {
    return this.prisma.dailyAssignment.findMany({
      where: { staffId },
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        staff: {
          select: { id: true, name: true, department: true, group: true }
        }
      }
    });
  }
}