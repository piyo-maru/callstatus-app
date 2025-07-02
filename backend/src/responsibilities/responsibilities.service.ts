import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface ResponsibilityData {
  // 一般部署用
  fax?: boolean;
  subjectCheck?: boolean;
  custom?: string;
  
  // 受付部署用（上記に加えて）
  lunch?: boolean;
  cs?: boolean;
}

@Injectable()
export class ResponsibilitiesService {
  constructor(private prisma: PrismaService) {}

  async getResponsibilitiesByDate(date: string) {
    try {
      console.log(`Getting responsibilities for date: ${date}`);
      
      // 指定日付のDailyAssignmentレコードを取得
      const assignments = await this.prisma.dailyAssignment.findMany({
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

    console.log(`Found ${assignments.length} assignments`);

    // スタッフごとにグループ化して責任データに変換
    const staffResponsibilities = new Map();

    for (const assignment of assignments) {
      const staffId = assignment.staffId;
      
      if (!staffResponsibilities.has(staffId)) {
        staffResponsibilities.set(staffId, {
          staffId,
          staffName: assignment.Staff.name,
          department: assignment.Staff.department,
          group: assignment.Staff.group,
          responsibilities: {
            lunch: false,
            fax: false,
            cs: false,
            subjectCheck: false,
            custom: ''
          }
        });
      }

      const staffData = staffResponsibilities.get(staffId);
      
      // assignmentTypeに基づいて責任フラグを設定
      switch (assignment.assignmentType) {
        case 'lunch':
          staffData.responsibilities.lunch = true;
          break;
        case 'fax':
          staffData.responsibilities.fax = true;
          break;
        case 'cs':
          staffData.responsibilities.cs = true;
          break;
        case 'subjectCheck':
          staffData.responsibilities.subjectCheck = true;
          break;
        case 'custom':
          staffData.responsibilities.custom = assignment.customLabel || '';
          break;
      }
    }

    return {
      responsibilities: Array.from(staffResponsibilities.values())
    };
    } catch (error) {
      console.error('Error in getResponsibilitiesByDate:', error);
      throw error;
    }
  }

  async saveResponsibilities(staffId: number, date: string, responsibilities: ResponsibilityData) {
    console.log(`Saving responsibilities for staff ${staffId} on ${date}:`, responsibilities);

    // 既存の責任設定を削除
    await this.prisma.dailyAssignment.deleteMany({
      where: {
        staffId,
        date: new Date(date)
      }
    });

    // 新しい責任設定を保存
    const assignmentsToCreate = [];

    if (responsibilities.lunch) {
      assignmentsToCreate.push({
        staffId,
        date: new Date(date),
        assignmentType: 'lunch',
        customLabel: null,
        updatedAt: new Date()
      });
    }

    if (responsibilities.fax) {
      assignmentsToCreate.push({
        staffId,
        date: new Date(date),
        assignmentType: 'fax',
        customLabel: null,
        updatedAt: new Date()
      });
    }

    if (responsibilities.cs) {
      assignmentsToCreate.push({
        staffId,
        date: new Date(date),
        assignmentType: 'cs',
        customLabel: null,
        updatedAt: new Date()
      });
    }

    if (responsibilities.subjectCheck) {
      assignmentsToCreate.push({
        staffId,
        date: new Date(date),
        assignmentType: 'subjectCheck',
        customLabel: null,
        updatedAt: new Date()
      });
    }

    if (responsibilities.custom && responsibilities.custom.trim() !== '') {
      assignmentsToCreate.push({
        staffId,
        date: new Date(date),
        assignmentType: 'custom',
        customLabel: responsibilities.custom.trim(),
        updatedAt: new Date()
      });
    }

    if (assignmentsToCreate.length > 0) {
      await this.prisma.dailyAssignment.createMany({
        data: assignmentsToCreate
      });
    }

    console.log(`Created ${assignmentsToCreate.length} assignment records`);

    return {
      success: true,
      staffId,
      date,
      assignmentsCreated: assignmentsToCreate.length
    };
  }

  async deleteResponsibilities(staffId: number, date: string) {
    console.log(`Deleting responsibilities for staff ${staffId} on ${date}`);

    const deleteResult = await this.prisma.dailyAssignment.deleteMany({
      where: {
        staffId,
        date: new Date(date)
      }
    });

    return {
      success: true,
      deletedCount: deleteResult.count
    };
  }
}