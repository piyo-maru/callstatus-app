import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SnapshotStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);

  constructor(private prisma: PrismaService) {}

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
   */
  private async getScheduleWithStaffInfo(tx: any, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await tx.adjustment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
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
}