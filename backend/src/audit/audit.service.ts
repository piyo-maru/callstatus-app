import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string | number;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 監査ログを記録
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId?.toString(),
          details: data.details ? JSON.stringify(data.details) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // 監査ログの記録失敗は元の処理に影響させない
      console.error('監査ログ記録エラー:', error);
    }
  }

  /**
   * ログイン成功を記録
   */
  async logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'LOGIN',
      resource: 'auth',
      details: { loginTime: new Date().toISOString() },
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * ログイン失敗を記録
   */
  async logLoginFailed(email: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId: 'UNKNOWN',
      action: 'LOGIN_FAILED',
      resource: 'auth',
      details: { email, reason, attemptTime: new Date().toISOString() },
      ipAddress,
      userAgent,
      success: false,
      errorMessage: reason,
    });
  }

  /**
   * パスワード変更を記録
   */
  async logPasswordChange(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'PASSWORD_CHANGE',
      resource: 'auth',
      details: { changeTime: new Date().toISOString() },
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * スケジュール操作を記録
   */
  async logScheduleAction(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    scheduleId?: number,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `SCHEDULE_${action}`,
      resource: 'schedule',
      resourceId: scheduleId,
      details,
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * スタッフ管理操作を記録
   */
  async logStaffAction(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW',
    staffId?: number,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `STAFF_${action}`,
      resource: 'staff',
      resourceId: staffId,
      details,
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * データインポートを記録
   */
  async logDataImport(
    userId: string,
    importType: 'STAFF' | 'SCHEDULE' | 'CONTRACT',
    recordCount: number,
    batchId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `IMPORT_${importType}`,
      resource: 'data',
      details: { recordCount, batchId, importTime: new Date().toISOString() },
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * 管理者操作を記録
   */
  async logAdminAction(
    userId: string,
    action: string,
    resource: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `ADMIN_${action}`,
      resource,
      details,
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * 監査ログを取得
   */
  async getAuditLogs(params: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (params.userId && params.userId !== 'ALL') {
      where.userId = params.userId;
    }
    if (params.action) {
      where.action = { contains: params.action };
    }
    if (params.resource) {
      where.resource = params.resource;
    }
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        where.timestamp.gte = params.startDate;
      }
      if (params.endDate) {
        where.timestamp.lte = params.endDate;
      }
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            userType: true,
            staff: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: params.limit || 100,
      skip: params.offset || 0,
    });

    const total = await this.prisma.auditLog.count({ where });

    return {
      logs: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
        userName: log.user?.staff?.name || log.user?.email || 'Unknown',
        userType: log.user?.userType || 'UNKNOWN',
      })),
      total,
      page: Math.floor((params.offset || 0) / (params.limit || 100)) + 1,
      totalPages: Math.ceil(total / (params.limit || 100)),
    };
  }
}