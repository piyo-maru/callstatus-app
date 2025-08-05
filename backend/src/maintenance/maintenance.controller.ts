import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';

// ================================================================================================
// callstatus メンテナンスコントローラー
// 手動メンテナンス実行・状態確認用API
// ================================================================================================

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  /**
   * 手動メンテナンス実行（テスト・緊急時用）
   * POST /api/maintenance/execute
   */
  @Post('execute')
  // @UseGuards(JwtAuthGuard) // 認証が有効化されたら追加
  async executeManualMaintenance() {
    try {
      const result = await this.maintenanceService.executeManualMaintenance();
      
      return {
        success: result.success,
        message: result.message,
        duration: result.duration,
        executedAt_utc: new Date().toISOString(),
        executedAt_jst: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      };
      
    } catch (error) {
      return {
        success: false,
        message: `手動メンテナンス実行エラー: ${error.message}`,
        duration: 0,
        executedAt_utc: new Date().toISOString(),
        executedAt_jst: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        error: error.message,
      };
    }
  }

  /**
   * メンテナンス機能の状態確認
   * GET /api/maintenance/status
   */
  @Get('status')
  async getMaintenanceStatus() {
    const now_utc = new Date().toISOString();
    const now_jst = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    
    // 次回実行時刻の計算（日本時間23:00 = UTC 14:00）
    const nextRun = new Date();
    nextRun.setUTCHours(14, 0, 0, 0); // UTC 14:00に設定
    
    // 今日の実行時刻が過ぎていれば、明日に設定
    if (new Date() > nextRun) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }
    
    const nextRun_utc = nextRun.toISOString();
    const nextRun_jst = nextRun.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    
    return {
      status: 'active',
      message: '日次メンテナンス機能は正常に稼働中です',
      currentTime: {
        utc: now_utc,
        jst: now_jst,
      },
      nextScheduledRun: {
        utc: nextRun_utc,
        jst: nextRun_jst,
      },
      schedule: {
        cronExpression: '0 14 * * *',
        description: '毎日UTC 14:00（日本時間 23:00）実行',
        timezone: 'UTC',
      },
      maintenanceType: 'ANALYZE only (データ削除なし)',
      targetTables: [
        'Staff',
        'Adjustment', 
        'Contract',
        'DailyAssignment',
        'ContractChangeLog',
        'ContractDisplayCache'
      ],
    };
  }
}