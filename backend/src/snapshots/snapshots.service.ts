import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { SnapshotStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);
  private isRetryRunning = false;

  constructor(private prisma: PrismaService) {}

  /**
   * 日次スナップショット自動実行（毎日深夜0時5分）
   */
  @Cron('5 0 * * *', {
    name: 'daily-snapshot',
    timeZone: 'Asia/Tokyo'
  })
  async handleDailyCron() {
    this.logger.log('日次スナップショット Cronジョブ開始');
    
    try {
      const result = await this.createDailySnapshot();
      this.logger.log(`日次スナップショット Cronジョブ完了: ${result.recordCount}件`);
    } catch (error) {
      this.logger.error(`日次スナップショット Cronジョブ失敗: ${error.message}`);
      // 失敗時は1時間後にリトライをスケジュール
      await this.scheduleRetry();
    }
  }

  /**
   * 失敗時のリトライスケジューリング（1時間後、最大3回）
   */
  @Cron('5 */1 * * *', {
    name: 'snapshot-retry',
    timeZone: 'Asia/Tokyo'
  })
  async handleRetryCron() {
    if (!this.isRetryRunning) {
      return;
    }

    const yesterday = this.getYesterday();
    const existingSnapshot = await this.checkExistingSnapshot(yesterday);

    if (existingSnapshot && existingSnapshot.status === 'COMPLETED') {
      this.logger.log('既に完了したスナップショットが存在するため、リトライを停止');
      this.isRetryRunning = false;
      return;
    }

    this.logger.log('スナップショット リトライ実行');
    
    try {
      const result = await this.createDailySnapshot();
      this.logger.log(`スナップショット リトライ成功: ${result.recordCount}件`);
      this.isRetryRunning = false;
    } catch (error) {
      this.logger.error(`スナップショット リトライ失敗: ${error.message}`);
      
      // 3回失敗したらリトライを停止
      const failedCount = await this.getFailedRetryCount(yesterday);
      if (failedCount >= 3) {
        this.logger.error('リトライ回数上限に達したため、リトライを停止');
        this.isRetryRunning = false;
      }
    }
  }

  /**
   * 指定日のスナップショットを手動作成
   */
  async createManualSnapshot(dateString: string) {
    const targetDate = new Date(dateString);
    const batchId = this.generateBatchId();
    
    this.logger.log(`手動スナップショット作成開始: ${dateString} (BatchID: ${batchId})`);
    
    try {
      return await this.executeSnapshot(targetDate, batchId);
    } catch (error) {
      this.logger.error(`スナップショット作成失敗: ${error.message}`);
      await this.handleSnapshotError(batchId, error);
      throw error;
    }
  }

  /**
   * 前日分のスナップショットを自動作成（Cron用）
   */
  async createDailySnapshot() {
    const yesterday = this.getYesterday();
    const batchId = this.generateBatchId();
    
    this.logger.log(`日次スナップショット作成開始: ${yesterday.toDateString()} (BatchID: ${batchId})`);
    
    try {
      return await this.executeSnapshot(yesterday, batchId);
    } catch (error) {
      this.logger.error(`日次スナップショット作成失敗: ${error.message}`);
      await this.handleSnapshotError(batchId, error);
      throw error;
    }
  }

  /**
   * スナップショット実行の中核処理
   */
  private async executeSnapshot(date: Date, batchId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. ログ開始記録
      await this.createSnapshotLog(tx, date, batchId);
      
      // 2. 対象データ取得（社員情報とスケジュール）
      const scheduleData = await this.getScheduleWithStaffInfo(tx, date);
      
      this.logger.log(`対象データ取得完了: ${scheduleData.length}件`);
      
      // 3. スナップショット作成
      const historicalData = this.transformToHistoricalData(scheduleData, batchId);
      
      if (historicalData.length > 0) {
        await this.saveHistoricalData(tx, historicalData);
      }
      
      // 4. ログ完了記録
      await this.completeSnapshotLog(tx, batchId, historicalData.length);
      
      this.logger.log(`スナップショット作成完了: ${historicalData.length}件`);
      
      return {
        batchId,
        targetDate: date,
        recordCount: historicalData.length,
        status: 'COMPLETED' as SnapshotStatus
      };
    });
  }

  /**
   * 指定日のスケジュールデータを社員情報と共に取得
   * 通常のAdjustmentと承認済みPendingの両方を取得
   */
  private async getScheduleWithStaffInfo(tx: any, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // 通常のAdjustmentと承認済みPendingレコードの両方を取得
    return await tx.adjustment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        OR: [
          { isPending: false },                    // 通常のAdjustment
          { isPending: true, approvedAt: { not: null } }  // 承認済みPending
        ]
      },
      include: {
        Staff: true
      }
    });
  }

  /**
   * データをHistoricalSchedule形式に変換
   */
  private transformToHistoricalData(scheduleData: any[], batchId: string) {
    return scheduleData.map(item => ({
      date: item.date,
      originalId: item.id,
      batchId,
      staffId: item.staffId,
      staffEmpNo: item.Staff.empNo,
      staffName: item.Staff.name,
      staffDepartment: item.Staff.department,
      staffGroup: item.Staff.group,
      staffIsActive: item.Staff.isActive,
      status: item.status,
      start: item.start,
      end: item.end,
      memo: item.memo,
      reason: item.reason,
      snapshotAt: new Date()
    }));
  }

  /**
   * 履歴データをデータベースに保存
   */
  private async saveHistoricalData(tx: any, historicalData: any[]) {
    return await tx.historicalSchedule.createMany({
      data: historicalData
    });
  }

  /**
   * スナップショット開始ログを作成
   */
  private async createSnapshotLog(tx: any, date: Date, batchId: string) {
    return await tx.snapshotLog.create({
      data: {
        batchId,
        targetDate: date,
        recordCount: 0,
        status: 'RUNNING'
      }
    });
  }

  /**
   * スナップショット完了ログを更新
   */
  private async completeSnapshotLog(tx: any, batchId: string, recordCount: number) {
    return await tx.snapshotLog.update({
      where: { batchId },
      data: {
        recordCount,
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });
  }

  /**
   * エラー時の処理
   */
  private async handleSnapshotError(batchId: string, error: Error) {
    try {
      await this.prisma.snapshotLog.update({
        where: { batchId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date()
        }
      });
    } catch (updateError) {
      this.logger.error(`エラーログ更新失敗: ${updateError.message}`);
    }
  }

  /**
   * バッチIDを生成
   */
  private generateBatchId(): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const uuid = uuidv4().split('-')[0];
    return `snap_${timestamp}_${uuid}`;
  }

  /**
   * 昨日の日付を取得
   */
  private getYesterday(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }

  /**
   * 指定日の履歴スケジュールデータを取得
   */
  async getHistoricalSchedules(dateString: string) {
    const targetDate = new Date(dateString);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    this.logger.log(`履歴スケジュール取得: ${dateString}`);

    const historicalData = await this.prisma.historicalSchedule.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: [
        { staffName: 'asc' },
        { start: 'asc' }
      ]
    });

    this.logger.log(`履歴スケジュール取得完了: ${historicalData.length}件`);
    return historicalData;
  }

  /**
   * スナップショット履歴を取得
   */
  async getSnapshotHistory(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.prisma.snapshotLog.findMany({
      where: {
        targetDate: {
          gte: cutoffDate
        }
      },
      orderBy: {
        targetDate: 'desc'
      }
    });
  }

  /**
   * 特定のスナップショットをロールバック
   */
  async rollbackSnapshot(batchId: string) {
    this.logger.log(`スナップショットロールバック開始: ${batchId}`);
    
    return await this.prisma.$transaction(async (tx) => {
      // 1. 該当する履歴データを削除
      const deleteResult = await tx.historicalSchedule.deleteMany({
        where: { batchId }
      });
      
      // 2. ログを更新
      await tx.snapshotLog.update({
        where: { batchId },
        data: {
          status: 'ROLLED_BACK',
          completedAt: new Date()
        }
      });
      
      this.logger.log(`ロールバック完了: ${deleteResult.count}件削除`);
      
      return {
        batchId,
        deletedCount: deleteResult.count
      };
    });
  }

  /**
   * リトライフラグを設定
   */
  private async scheduleRetry() {
    this.isRetryRunning = true;
    this.logger.log('スナップショットリトライをスケジュール');
  }

  /**
   * 指定日の既存スナップショットをチェック
   */
  private async checkExistingSnapshot(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.prisma.snapshotLog.findFirst({
      where: {
        targetDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: 'COMPLETED'
      },
      orderBy: {
        startedAt: 'desc'
      }
    });
  }

  /**
   * 指定日の失敗したリトライ回数を取得
   */
  private async getFailedRetryCount(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const failedLogs = await this.prisma.snapshotLog.findMany({
      where: {
        targetDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: 'FAILED'
      }
    });

    return failedLogs.length;
  }

  /**
   * 過去30日分の初期スナップショットデータを作成
   */
  async createInitialHistoricalData(days: number = 30) {
    this.logger.log(`過去${days}日分のスナップショット作成開始`);
    
    const results = [];
    const errors = [];
    
    for (let i = 1; i <= days; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);
      
      const dateString = targetDate.toISOString().split('T')[0];
      
      try {
        // 既存のスナップショットをチェック
        const existing = await this.checkExistingSnapshot(targetDate);
        if (existing) {
          this.logger.log(`スキップ: ${dateString} (既にスナップショット存在)`);
          continue;
        }

        // サンプルデータを生成してスナップショット作成
        const result = await this.createManualSnapshot(dateString);
        results.push({
          date: dateString,
          status: 'success',
          recordCount: result.recordCount
        });
        
        this.logger.log(`完了: ${dateString} (${result.recordCount}件)`);
        
        // レート制限（1秒待機）
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        this.logger.error(`エラー: ${dateString} - ${error.message}`);
        errors.push({
          date: dateString,
          error: error.message
        });
      }
    }
    
    this.logger.log(`初期スナップショット作成完了: 成功${results.length}件, エラー${errors.length}件`);
    
    return {
      success: results.length,
      errors: errors.length,
      results,
      errorDetails: errors
    };
  }
}