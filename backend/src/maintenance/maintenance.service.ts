import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

// ================================================================================================
// callstatus 日次メンテナンスサービス
// 300人想定での日次統計情報更新（ANALYZE のみ）
// 実行時刻: 日本時間 23:00（UTC 14:00）
// データ削除は絶対に行わない（ANALYZE のみ実行）
// ================================================================================================

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 日次データベースメンテナンス実行
   * 実行時刻: 日本時間 23:00（UTC 14:00）
   * クロン式: '0 14 * * *' （秒 分 時 日 月 曜日）
   */
  @Cron('0 14 * * *', {
    name: 'daily-database-maintenance',
    timeZone: 'UTC', // 内部処理はUTC基準（時刻ルール遵守）
  })
  async performDailyMaintenance(): Promise<void> {
    const startTime_utc = new Date().toISOString();
    
    this.logger.log(`=== 日次メンテナンス開始 ===`);
    this.logger.log(`開始時刻（UTC）: ${startTime_utc}`);
    this.logger.log(`開始時刻（JST）: ${new Date(startTime_utc).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);

    try {
      // Phase 1: データベース統計情報更新（ANALYZE）
      await this.executeAnalyze();

      // Phase 2: メンテナンス結果の検証
      await this.verifyMaintenanceResults();

      const endTime_utc = new Date().toISOString();
      const duration = new Date(endTime_utc).getTime() - new Date(startTime_utc).getTime();

      this.logger.log(`=== 日次メンテナンス完了 ===`);
      this.logger.log(`終了時刻（UTC）: ${endTime_utc}`);
      this.logger.log(`終了時刻（JST）: ${new Date(endTime_utc).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      this.logger.log(`実行時間: ${duration}ms (${(duration / 1000).toFixed(2)}秒)`);

    } catch (error) {
      const errorTime_utc = new Date().toISOString();
      
      this.logger.error(`=== 日次メンテナンス失敗 ===`);
      this.logger.error(`エラー時刻（UTC）: ${errorTime_utc}`);
      this.logger.error(`エラー時刻（JST）: ${new Date(errorTime_utc).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      this.logger.error(`エラー内容: ${error.message}`);
      this.logger.error(`スタックトレース: ${error.stack}`);

      // 重要: データベース接続状態の確認
      await this.checkDatabaseHealth();
    }
  }

  /**
   * データベース統計情報更新（ANALYZE）
   * データ削除は絶対に行わない
   */
  private async executeAnalyze(): Promise<void> {
    this.logger.log('📊 統計情報更新（ANALYZE）開始...');

    try {
      // 重要なテーブルの統計情報を個別に更新
      const tablesToAnalyze = [
        'Staff',
        'Adjustment', 
        'Contract',
        'DailyAssignment',
        'ContractChangeLog',
        'ContractDisplayCache'
      ];

      for (const tableName of tablesToAnalyze) {
        const tableStartTime = Date.now();
        
        await this.prisma.$executeRawUnsafe(`ANALYZE "${tableName}";`);
        
        const tableEndTime = Date.now();
        const tableDuration = tableEndTime - tableStartTime;
        
        this.logger.log(`✅ ${tableName}テーブル ANALYZE完了 (${tableDuration}ms)`);
      }

      // 全体統計情報更新
      const globalStartTime = Date.now();
      await this.prisma.$executeRaw`ANALYZE;`;
      const globalEndTime = Date.now();
      const globalDuration = globalEndTime - globalStartTime;

      this.logger.log(`✅ 全体統計情報更新完了 (${globalDuration}ms)`);
      this.logger.log('📊 統計情報更新（ANALYZE）正常完了');

    } catch (error) {
      this.logger.error('❌ 統計情報更新エラー:', error.message);
      throw new Error(`ANALYZE実行失敗: ${error.message}`);
    }
  }

  /**
   * メンテナンス結果の検証
   */
  private async verifyMaintenanceResults(): Promise<void> {
    this.logger.log('🔍 メンテナンス結果検証開始...');

    try {
      // 主要テーブルのレコード数確認（データ消失チェック）
      const staffCount = await this.prisma.staff.count();
      const adjustmentCount = await this.prisma.adjustment.count();
      const contractCount = await this.prisma.contract.count();

      this.logger.log('📋 データ整合性確認:');
      this.logger.log(`  Staff: ${staffCount}件`);
      this.logger.log(`  Adjustment: ${adjustmentCount}件`);
      this.logger.log(`  Contract: ${contractCount}件`);

      // データ消失の検証（基準値との比較）
      if (staffCount < 40 || adjustmentCount < 3000) {
        throw new Error(`データ異常検出 - Staff: ${staffCount}件, Adjustment: ${adjustmentCount}件`);
      }

      this.logger.log('✅ データ整合性確認完了 - 正常');

      // データベース接続状態の確認
      await this.prisma.$executeRaw`SELECT 1;`;
      this.logger.log('✅ データベース接続状態確認完了 - 正常');

      this.logger.log('🔍 メンテナンス結果検証正常完了');

    } catch (error) {
      this.logger.error('❌ メンテナンス結果検証エラー:', error.message);
      throw new Error(`検証失敗: ${error.message}`);
    }
  }

  /**
   * データベース接続状態確認（エラー時のヘルスチェック）
   */
  private async checkDatabaseHealth(): Promise<void> {
    try {
      await this.prisma.$executeRaw`SELECT 1;`;
      this.logger.log('✅ データベース接続状態: 正常');
    } catch (healthError) {
      this.logger.error('🚨 データベース接続異常:', healthError.message);
    }
  }

  /**
   * 手動メンテナンス実行（テスト・緊急時用）
   */
  async executeManualMaintenance(): Promise<{ success: boolean; message: string; duration: number }> {
    const startTime = Date.now();
    
    try {
      this.logger.log('🔧 手動メンテナンス実行開始...');
      
      await this.executeAnalyze();
      await this.verifyMaintenanceResults();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const successMessage = `手動メンテナンス正常完了 (${duration}ms)`;
      this.logger.log(`✅ ${successMessage}`);
      
      return {
        success: true,
        message: successMessage,
        duration
      };
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const errorMessage = `手動メンテナンス失敗: ${error.message} (${duration}ms)`;
      this.logger.error(`❌ ${errorMessage}`);
      
      return {
        success: false,
        message: errorMessage,
        duration
      };
    }
  }
}