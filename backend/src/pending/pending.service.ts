import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreatePendingDto {
  staffId: number;
  date: string;
  status: string;
  start: number;
  end: number;
  memo?: string;
  pendingType: 'monthly-planner' | 'manual';
}

export interface ApprovalDto {
  reason?: string;
}

export interface BulkApprovalDto {
  pendingIds: number[];
  action: 'approve' | 'reject';
  reason?: string;
}

@Injectable()
export class PendingService {
  constructor(private prisma: PrismaService) {}

  /**
   * JST入力値を内部UTC時刻に変換
   */
  private jstToUtc(decimalHour: number, baseDateString: string): Date {
    const hours = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour % 1) * 60);
    
    const jstIsoString = `${baseDateString}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00+09:00`;
    return new Date(jstIsoString);
  }

  /**
   * UTC時刻をJST小数点時刻に変換
   */
  private utcToJstDecimal(utcDate: Date): number {
    const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    const hours = jstDate.getHours();
    const minutes = jstDate.getMinutes();
    return hours + minutes / 60;
  }

  /**
   * Pending作成
   */
  async create(createPendingDto: CreatePendingDto, creatorId: number) {
    console.log('Creating pending schedule:', createPendingDto);

    // 権限チェック：自分のpendingのみ作成可能
    // 一時的に無効化（認証システム統合まで）
    // if (createPendingDto.staffId !== creatorId) {
    //   throw new ForbiddenException('他の人のpendingは作成できません');
    // }

    const startUtc = this.jstToUtc(createPendingDto.start, createPendingDto.date);
    const endUtc = this.jstToUtc(createPendingDto.end, createPendingDto.date);

    const pending = await this.prisma.adjustment.create({
      data: {
        staffId: createPendingDto.staffId,
        date: new Date(createPendingDto.date),
        status: createPendingDto.status,
        start: startUtc,
        end: endUtc,
        memo: createPendingDto.memo || null,
        reason: null,
        batchId: null,
        isPending: true,
        pendingType: createPendingDto.pendingType,
        updatedAt: new Date(),
      },
    });

    // 承認ログに記録
    await this.prisma.pendingApprovalLog.create({
      data: {
        adjustmentId: pending.id,
        action: 'pending',
        actorId: creatorId,
        reason: 'Pending created',
      },
    });

    console.log('Pending created:', pending.id);
    return this.formatPendingResponse(pending);
  }

  /**
   * Pending取得（フィルター付き）
   */
  async findAll(filters: {
    staffId?: number;
    date?: string;
    department?: string;
    pendingType?: string;
  }) {
    const where: any = { isPending: true };

    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.date) where.date = new Date(filters.date);
    if (filters.pendingType) where.pendingType = filters.pendingType;

    const pendings = await this.prisma.adjustment.findMany({
      where,
      include: {
        Staff: true,
        ApprovedBy: {
          select: { id: true, name: true }
        },
        RejectedBy: {
          select: { id: true, name: true }
        },
        ApprovalLogs: {
          include: {
            Actor: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 部署フィルター（Staffリレーション経由）
    const filteredPendings = filters.department
      ? pendings.filter(p => p.Staff.department === filters.department)
      : pendings;

    return filteredPendings.map(p => this.formatPendingResponse(p));
  }

  /**
   * 単一Pending取得
   */
  async findOne(id: number, requesterId: number, isAdmin: boolean = false) {
    const pending = await this.prisma.adjustment.findUnique({
      where: { id, isPending: true },
      include: {
        Staff: true,
        ApprovedBy: {
          select: { id: true, name: true }
        },
        RejectedBy: {
          select: { id: true, name: true }
        },
        ApprovalLogs: {
          include: {
            Actor: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!pending) {
      throw new NotFoundException('Pendingが見つかりません');
    }

    // 権限チェック：自分のpendingまたは管理者のみ閲覧可能
    // 一時的に無効化（認証システム統合まで）
    // if (!isAdmin && pending.staffId !== requesterId) {
    //   throw new ForbiddenException('このpendingを閲覧する権限がありません');
    // }

    return this.formatPendingResponse(pending);
  }

  /**
   * Pending更新（承認前のみ）
   */
  async update(id: number, updateData: Partial<CreatePendingDto>, updaterId: number) {
    const pending = await this.prisma.adjustment.findUnique({
      where: { id, isPending: true }
    });

    if (!pending) {
      throw new NotFoundException('Pendingが見つかりません');
    }

    // 権限チェック：自分のpendingのみ編集可能
    // 一時的に無効化（認証システム統合まで）
    // if (pending.staffId !== updaterId) {
    //   throw new ForbiddenException('他の人のpendingは編集できません');
    // }

    // 承認済み・却下済みは編集不可
    if (pending.approvedAt || pending.rejectedAt) {
      throw new BadRequestException('承認済み・却下済みのpendingは編集できません');
    }

    const updateFields: any = {};
    
    if (updateData.status) updateFields.status = updateData.status;
    if (updateData.memo !== undefined) updateFields.memo = updateData.memo;
    if (updateData.date) {
      updateFields.date = new Date(updateData.date);
      // 日付が変更された場合は時刻も再計算
      if (updateData.start) {
        updateFields.start = this.jstToUtc(updateData.start, updateData.date);
      } else if (pending.start) {
        // 既存の時刻を新しい日付で再計算
        const existingStartDecimal = this.utcToJstDecimal(pending.start);
        updateFields.start = this.jstToUtc(existingStartDecimal, updateData.date);
      }
      if (updateData.end) {
        updateFields.end = this.jstToUtc(updateData.end, updateData.date);
      } else if (pending.end) {
        // 既存の時刻を新しい日付で再計算
        const existingEndDecimal = this.utcToJstDecimal(pending.end);
        updateFields.end = this.jstToUtc(existingEndDecimal, updateData.date);
      }
    } else {
      // 日付が変更されない場合の時刻更新
      if (updateData.start && updateData.date) {
        updateFields.start = this.jstToUtc(updateData.start, updateData.date);
      }
      if (updateData.end && updateData.date) {
        updateFields.end = this.jstToUtc(updateData.end, updateData.date);
      }
    }

    const updated = await this.prisma.adjustment.update({
      where: { id },
      data: updateFields,
    });

    console.log('Pending updated:', id);
    return this.formatPendingResponse(updated);
  }

  /**
   * Pending削除（承認前のみ）
   */
  async remove(id: number, deleterId: number) {
    const pending = await this.prisma.adjustment.findUnique({
      where: { id, isPending: true }
    });

    if (!pending) {
      throw new NotFoundException('Pendingが見つかりません');
    }

    // 権限チェック：自分のpendingのみ削除可能
    // 一時的に無効化（認証システム統合まで）
    // if (pending.staffId !== deleterId) {
    //   throw new ForbiddenException('他の人のpendingは削除できません');
    // }

    // 承認済み・却下済みは削除不可
    if (pending.approvedAt || pending.rejectedAt) {
      throw new BadRequestException('承認済み・却下済みのpendingは削除できません');
    }

    // まずApprovalLogsを削除
    await this.prisma.pendingApprovalLog.deleteMany({
      where: { adjustmentId: id }
    });
    
    // その後Adjustmentを削除
    await this.prisma.adjustment.delete({
      where: { id }
    });

    console.log('Pending deleted:', id);
    return { success: true, message: 'Pendingを削除しました' };
  }

  /**
   * Pending承認
   */
  async approve(id: number, approvalDto: ApprovalDto, approverId: number) {
    const pending = await this.prisma.adjustment.findUnique({
      where: { id, isPending: true }
    });

    if (!pending) {
      throw new NotFoundException('Pendingが見つかりません');
    }

    if (pending.approvedAt || pending.rejectedAt) {
      throw new BadRequestException('既に処理済みのpendingです');
    }

    const approved = await this.prisma.adjustment.update({
      where: { id },
      data: {
        // isPending: true を維持（月次プランナーで承認済み予定を表示するため）
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });

    // 承認ログに記録
    await this.prisma.pendingApprovalLog.create({
      data: {
        adjustmentId: id,
        action: 'approved',
        actorId: approverId,
        reason: approvalDto.reason || 'Approved',
      },
    });

    console.log('Pending approved:', id);
    return this.formatPendingResponse(approved);
  }

  /**
   * Pending却下
   */
  async reject(id: number, approvalDto: ApprovalDto, rejectorId: number) {
    const pending = await this.prisma.adjustment.findUnique({
      where: { id, isPending: true }
    });

    if (!pending) {
      throw new NotFoundException('Pendingが見つかりません');
    }

    if (pending.approvedAt || pending.rejectedAt) {
      throw new BadRequestException('既に処理済みのpendingです');
    }

    const rejected = await this.prisma.adjustment.update({
      where: { id },
      data: {
        rejectedBy: rejectorId,
        rejectedAt: new Date(),
        rejectionReason: approvalDto.reason || 'Rejected',
      },
    });

    // 却下ログに記録
    await this.prisma.pendingApprovalLog.create({
      data: {
        adjustmentId: id,
        action: 'rejected',
        actorId: rejectorId,
        reason: approvalDto.reason || 'Rejected',
      },
    });

    console.log('Pending rejected:', id);
    return this.formatPendingResponse(rejected);
  }

  /**
   * 一括承認・却下
   */
  async bulkApproval(bulkDto: BulkApprovalDto, actorId: number) {
    console.log(`Bulk ${bulkDto.action} for ${bulkDto.pendingIds.length} pendings`);

    const results = [];
    const errors = [];

    for (const pendingId of bulkDto.pendingIds) {
      try {
        const result = bulkDto.action === 'approve'
          ? await this.approve(pendingId, { reason: bulkDto.reason }, actorId)
          : await this.reject(pendingId, { reason: bulkDto.reason }, actorId);
        
        results.push(result);
      } catch (error) {
        console.error(`Error processing pending ${pendingId}:`, error.message);
        errors.push({
          pendingId,
          error: error.message
        });
      }
    }

    return {
      success: results.length,
      errors: errors.length,
      results,
      errorDetails: errors
    };
  }

  /**
   * 管理者用：全pending一覧
   */
  async findAllForAdmin(filters: {
    date?: string;
    department?: string;
    status?: 'pending' | 'approved' | 'rejected';
  }) {
    const where: any = { isPending: true };

    if (filters.date) where.date = new Date(filters.date);

    // ステータスフィルター
    if (filters.status === 'approved') {
      where.approvedAt = { not: null };
    } else if (filters.status === 'rejected') {
      where.rejectedAt = { not: null };
    } else if (filters.status === 'pending') {
      where.approvedAt = null;
      where.rejectedAt = null;
    }

    const pendings = await this.prisma.adjustment.findMany({
      where,
      include: {
        Staff: true,
        ApprovedBy: {
          select: { id: true, name: true }
        },
        RejectedBy: {
          select: { id: true, name: true }
        },
        ApprovalLogs: {
          include: {
            Actor: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 部署フィルター
    const filteredPendings = filters.department
      ? pendings.filter(p => p.Staff.department === filters.department)
      : pendings;

    return filteredPendings.map(p => this.formatPendingResponse(p));
  }

  /**
   * 月次プランナー専用：承認済み・未承認両方のpending予定取得
   */
  async findAllForMonthlyPlanner(year: number, month: number) {
    console.log(`Monthly planner: fetching pendings for ${year}-${month}`);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const pendings = await this.prisma.adjustment.findMany({
      where: {
        isPending: true, // pending予定のみ（承認済み・未承認両方）
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        Staff: {
          select: { id: true, name: true, department: true, group: true }
        },
        ApprovedBy: {
          select: { id: true, name: true }
        },
        RejectedBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { date: 'asc' },
        { start: 'asc' }
      ]
    });

    return pendings.map(p => this.formatPendingResponse(p));
  }

  /**
   * レスポンス形式統一
   */
  private formatPendingResponse(pending: any) {
    return {
      id: pending.id,
      staffId: pending.staffId,
      staffName: pending.Staff?.name,
      date: pending.date,
      status: pending.status,
      start: this.utcToJstDecimal(pending.start),
      end: this.utcToJstDecimal(pending.end),
      memo: pending.memo,
      isPending: pending.isPending,
      pendingType: pending.pendingType,
      approvedBy: pending.ApprovedBy,
      approvedAt: pending.approvedAt,
      rejectedBy: pending.RejectedBy,
      rejectedAt: pending.rejectedAt,
      rejectionReason: pending.rejectionReason,
      approvalLogs: pending.ApprovalLogs || [],
      createdAt: pending.createdAt,
      updatedAt: pending.updatedAt,
    };
  }
}