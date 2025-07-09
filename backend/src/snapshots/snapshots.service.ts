import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { SnapshotStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);
  private isRetryRunning = false;

  constructor(private prisma: PrismaService) {}

  /**
   * 日次スナップショット自動実行（毎日UTC 06:05 = JST当日15:05）
   * CLAUDE.md厳格ルール準拠：内部処理は完全UTC
   */
  @Cron('5 6 * * *', {
    name: 'daily-snapshot',
    timeZone: 'UTC'
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
    timeZone: 'UTC'
  })
  async handleRetryCron() {
    if (!this.isRetryRunning) {
      return;
    }

    const targetDate = this.getTargetDateUTC();
    const existingSnapshot = await this.checkExistingSnapshot(targetDate);

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
      const failedCount = await this.getFailedRetryCount(targetDate);
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
   * 対象日分のスナップショットを自動作成（Cron用）
   * UTC 15:05実行でUTC当日データ取得 = JST 00:05実行でJST前日データ取得
   */
  async createDailySnapshot() {
    const targetDate = this.getTargetDateUTC();
    const batchId = this.generateBatchId();
    
    this.logger.log(`日次スナップショット作成開始: ${targetDate.toDateString()} (BatchID: ${batchId})`);
    
    try {
      return await this.executeSnapshot(targetDate, batchId);
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
   * CLAUDE.md厳格ルール準拠：UTC基準での日付範囲設定
   */
  private async getScheduleWithStaffInfo(tx: any, date: Date) {
    const { startOfDayUTC, endOfDayUTC } = this.getUTCDayRange(date);
    
    // 通常のAdjustmentと承認済みPendingレコードの両方を取得
    // CLAUDE.md厳格ルール準拠：UTC範囲でのクエリ
    // 論理削除対応: アクティブ社員のみを対象
    return await tx.adjustment.findMany({
      where: {
        date: {
          gte: startOfDayUTC,
          lte: endOfDayUTC
        },
        OR: [
          { isPending: false },                    // 通常のAdjustment
          { isPending: true, approvedAt: { not: null } }  // 承認済みPending
        ],
        Staff: { isActive: true }  // アクティブ社員のみ対象
      },
      include: {
        Staff: true
      }
    });
  }

  /**
   * データをHistoricalSchedule形式に変換
   * CLAUDE.md厳格ルール準拠：UTCカラム主体、既存カラムは並行運用
   */
  private transformToHistoricalData(scheduleData: any[], batchId: string) {
    const snapshotTimeUTC = new Date();
    
    return scheduleData.map(item => {
      // UTCカラム主体で処理（CLAUDE.md厳格ルール準拠）
      const primaryDateUTC = item.date_utc || item.date;
      const primaryStartUTC = item.start_utc || item.start;
      const primaryEndUTC = item.end_utc || item.end;
      
      return {
        // 既存カラム（並行運用のため保持、UTCデータを設定）
        date: primaryDateUTC,
        start: primaryStartUTC,
        end: primaryEndUTC,
        snapshotAt: snapshotTimeUTC,
        // 新UTCカラム（メイン使用）
        date_utc: primaryDateUTC,
        start_utc: primaryStartUTC,
        end_utc: primaryEndUTC,
        snapshotAt_utc: snapshotTimeUTC,
        // その他のフィールド
        originalId: item.id,
        batchId,
        staffId: item.staffId,
        staffEmpNo: item.Staff.empNo,
        staffName: item.Staff.name,
        staffDepartment: item.Staff.department,
        staffGroup: item.Staff.group,
        staffIsActive: item.Staff.isActive,
        status: item.status,
        memo: item.memo,
        reason: item.reason
      };
    });
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
   * 対象日の日付を取得（UTC基準）
   * UTC 15:05実行時にUTC当日データ取得 = JST 00:05実行時にJST前日データ取得
   * CLAUDE.md厳格ルール準拠：内部時刻は完全UTC
   */
  private getTargetDateUTC(): Date {
    const utcNow = new Date();
    const utcTargetDate = new Date(Date.UTC(
      utcNow.getUTCFullYear(),
      utcNow.getUTCMonth(),
      utcNow.getUTCDate(), // 前日ではなく当日（UTC基準）
      0, 0, 0, 0
    ));
    this.logger.log(`UTC基準での対象日: ${utcTargetDate.toISOString()} (現在UTC: ${utcNow.toISOString()})`);
    return utcTargetDate;
  }

  /**
   * 指定日のUTC基準での1日の範囲を取得
   * CLAUDE.md厳格ルール準拠：UTC基準での日付範囲計算
   */
  private getUTCDayRange(date: Date) {
    const startOfDayUTC = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0
    ));
    
    const endOfDayUTC = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23, 59, 59, 999
    ));
    
    this.logger.log(`UTC日付範囲: ${startOfDayUTC.toISOString()} 〜 ${endOfDayUTC.toISOString()}`);
    return { startOfDayUTC, endOfDayUTC };
  }

  /**
   * 指定日の履歴スケジュールデータを取得
   */
  async getHistoricalSchedules(dateString: string) {
    const targetDate = new Date(dateString);
    const { startOfDayUTC, endOfDayUTC } = this.getUTCDayRange(targetDate);

    this.logger.log(`履歴スケジュール取得: ${dateString} (UTC範囲: ${startOfDayUTC.toISOString()} 〜 ${endOfDayUTC.toISOString()})`);

    // 論理削除対応: アクティブ社員のIDリストを取得
    const activeStaff = await this.prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true }
    });
    const activeStaffIds = activeStaff.map(staff => staff.id);

    // CLAUDE.md厳格ルール準拠：UTC範囲でのクエリ、将来的にdate_utcに移行
    // 論理削除対応: アクティブ社員のみを対象
    const historicalData = await this.prisma.historicalSchedule.findMany({
      where: {
        date: {  // 現在は既存カラム使用、将来的にdate_utcに移行
          gte: startOfDayUTC,
          lte: endOfDayUTC
        },
        staffId: { in: activeStaffIds }  // アクティブ社員のみ対象
      },
      orderBy: [
        { staffName: 'asc' },
        { start: 'asc' }  // 将来的にstart_utcに移行
      ]
    });

    this.logger.log(`履歴スケジュール取得完了: ${historicalData.length}件（アクティブ社員 ${activeStaffIds.length}名）`);
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
   * 指定日の既存スナップショットをチェック（UTC基準）
   * CLAUDE.md厳格ルール準拠：UTC基準での日付範囲
   */
  private async checkExistingSnapshot(date: Date) {
    const { startOfDayUTC, endOfDayUTC } = this.getUTCDayRange(date);

    return await this.prisma.snapshotLog.findFirst({
      where: {
        targetDate: {
          gte: startOfDayUTC,
          lte: endOfDayUTC
        },
        status: 'COMPLETED'
      },
      orderBy: {
        startedAt: 'desc'
      }
    });
  }

  /**
   * 指定日の失敗したリトライ回数を取得（UTC基準）
   * CLAUDE.md厳格ルール準拠：UTC基準での日付範囲
   */
  private async getFailedRetryCount(date: Date) {
    const { startOfDayUTC, endOfDayUTC } = this.getUTCDayRange(date);

    const failedLogs = await this.prisma.snapshotLog.findMany({
      where: {
        targetDate: {
          gte: startOfDayUTC,
          lte: endOfDayUTC
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