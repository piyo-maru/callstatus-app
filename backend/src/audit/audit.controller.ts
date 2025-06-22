import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * 監査ログ取得（管理者のみ）
   */
  @Get('logs')
  @Roles('ADMIN')
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() req?: any
  ) {
    // 管理者操作を記録
    await this.auditService.logAdminAction(
      req.user?.sub,
      'VIEW_AUDIT_LOGS',
      'audit',
      { filters: { userId, action, resource, startDate, endDate } },
      req.ip,
      req.get('user-agent')
    );

    return this.auditService.getAuditLogs({
      userId,
      action,
      resource,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  /**
   * 監査ログ統計取得（管理者のみ）
   */
  @Get('stats')
  @Roles('ADMIN')
  async getAuditStats(@Req() req?: any) {
    await this.auditService.logAdminAction(
      req.user?.sub,
      'VIEW_AUDIT_STATS',
      'audit',
      {},
      req.ip,
      req.get('user-agent')
    );

    // 今日の統計
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 今週の統計
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [
      todayLogs,
      weekLogs,
      loginSuccessToday,
      loginFailedToday,
      recentActions
    ] = await Promise.all([
      // 今日のログ数
      this.auditService.getAuditLogs({
        startDate: today,
        endDate: tomorrow,
        limit: 1
      }),
      // 今週のログ数
      this.auditService.getAuditLogs({
        startDate: weekStart,
        limit: 1
      }),
      // 今日のログイン成功数
      this.auditService.getAuditLogs({
        action: 'LOGIN',
        startDate: today,
        endDate: tomorrow,
        limit: 1
      }),
      // 今日のログイン失敗数
      this.auditService.getAuditLogs({
        action: 'LOGIN_FAILED',
        startDate: today,
        endDate: tomorrow,
        limit: 1
      }),
      // 最近のアクション（上位5件）
      this.auditService.getAuditLogs({
        limit: 5
      })
    ]);

    return {
      today: {
        totalLogs: todayLogs.total,
        loginSuccess: loginSuccessToday.total,
        loginFailed: loginFailedToday.total,
      },
      week: {
        totalLogs: weekLogs.total,
      },
      recentActions: recentActions.logs,
      lastUpdated: new Date().toISOString(),
    };
  }
}