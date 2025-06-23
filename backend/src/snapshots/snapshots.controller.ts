import { Controller, Post, Get, Delete, Param, Query, Body } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';

@Controller('admin/snapshots')
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  /**
   * 手動スナップショット作成
   */
  @Post('manual/:date')
  async createManualSnapshot(@Param('date') date: string) {
    return this.snapshotsService.createManualSnapshot(date);
  }

  /**
   * スナップショット履歴取得
   */
  @Get('history')
  async getSnapshotHistory(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.snapshotsService.getSnapshotHistory(daysNum);
  }

  /**
   * スナップショットのロールバック
   */
  @Delete('rollback/:batchId')
  async rollbackSnapshot(@Param('batchId') batchId: string) {
    return this.snapshotsService.rollbackSnapshot(batchId);
  }

  /**
   * 日次スナップショット手動実行（テスト用）
   */
  @Post('daily')
  async runDailySnapshot() {
    return this.snapshotsService.createDailySnapshot();
  }

  /**
   * 初期履歴データ作成（過去30日分）
   */
  @Post('initial/:days')
  async createInitialData(@Param('days') days: string) {
    const daysNum = parseInt(days, 10) || 30;
    return this.snapshotsService.createInitialHistoricalData(daysNum);
  }
}