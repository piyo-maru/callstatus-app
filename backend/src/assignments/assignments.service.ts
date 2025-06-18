import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateAssignmentDto {
  staffId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  tempDept: string;
  tempGroup: string;
  reason?: string;
}

export interface UpdateAssignmentDto {
  startDate?: string;
  endDate?: string;
  tempDept?: string;
  tempGroup?: string;
  reason?: string;
  isActive?: boolean;
}

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * スタッフの支援設定一覧を取得
   */
  async findByStaffId(staffId: number) {
    return this.prisma.temporaryAssignment.findMany({
      where: { staffId },
      orderBy: { startDate: 'desc' },
      include: {
        staff: {
          select: { id: true, name: true, department: true, group: true }
        }
      }
    });
  }

  /**
   * 支援設定を作成
   */
  async create(createDto: CreateAssignmentDto) {
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    // バリデーション
    if (startDate >= endDate) {
      throw new Error('開始日は終了日より前である必要があります');
    }

    // 期間重複チェック
    const overlapping = await this.prisma.temporaryAssignment.findFirst({
      where: {
        staffId: createDto.staffId,
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } }
            ]
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      throw new Error('指定期間に重複する支援設定が存在します');
    }

    return this.prisma.temporaryAssignment.create({
      data: {
        staffId: createDto.staffId,
        startDate,
        endDate,
        tempDept: createDto.tempDept,
        tempGroup: createDto.tempGroup,
        reason: createDto.reason || '支援'
      },
      include: {
        staff: {
          select: { id: true, name: true, department: true, group: true }
        }
      }
    });
  }

  /**
   * 支援設定を更新
   */
  async update(id: number, updateDto: UpdateAssignmentDto) {
    const data: any = {};
    
    if (updateDto.startDate) data.startDate = new Date(updateDto.startDate);
    if (updateDto.endDate) data.endDate = new Date(updateDto.endDate);
    if (updateDto.tempDept) data.tempDept = updateDto.tempDept;
    if (updateDto.tempGroup) data.tempGroup = updateDto.tempGroup;
    if (updateDto.reason) data.reason = updateDto.reason;
    if (typeof updateDto.isActive === 'boolean') data.isActive = updateDto.isActive;

    return this.prisma.temporaryAssignment.update({
      where: { id },
      data,
      include: {
        staff: {
          select: { id: true, name: true, department: true, group: true }
        }
      }
    });
  }

  /**
   * 支援設定を削除（論理削除）
   */
  async remove(id: number) {
    return this.prisma.temporaryAssignment.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * 指定日時点での有効な支援設定を取得
   */
  async getActiveAssignmentByDate(staffId: number, date: Date) {
    return this.prisma.temporaryAssignment.findFirst({
      where: {
        staffId,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date }
      }
    });
  }

  /**
   * 全スタッフの支援状態を取得（指定日基準）
   */
  async getAllStaffSupportStatus(date: Date = new Date()) {
    const allStaff = await this.prisma.staff.findMany({
      include: {
        temporaryAssignments: {
          where: {
            isActive: true,
            startDate: { lte: date },
            endDate: { gte: date }
          }
        }
      }
    });

    return allStaff.map(staff => {
      const activeAssignment = staff.temporaryAssignments[0];
      return {
        id: staff.id,
        name: staff.name,
        originalDept: staff.department,
        originalGroup: staff.group,
        currentDept: activeAssignment?.tempDept || staff.department,
        currentGroup: activeAssignment?.tempGroup || staff.group,
        isSupporting: !!activeAssignment,
        supportInfo: activeAssignment ? {
          startDate: activeAssignment.startDate,
          endDate: activeAssignment.endDate,
          reason: activeAssignment.reason
        } : null
      };
    });
  }
}