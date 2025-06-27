import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SchedulesGateway } from './schedules.gateway';
import { LayerManagerService } from '../layer-manager/layer-manager.service';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SchedulesGateway))
    private readonly gateway: SchedulesGateway,
    private layerManager: LayerManagerService,
  ) {}

  // テスト用にLayerManagerServiceを公開
  getLayerManager(): LayerManagerService {
    return this.layerManager;
  }

  // JST入力値を内部UTC時刻に変換（厳格ルール準拠）
  private jstToUtc(decimalHour: number, baseDateString: string): Date {
    const hours = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour % 1) * 60);
    
    // JST時刻文字列を構築（ISO-8601形式、+09:00タイムゾーン付き）
    const jstIsoString = `${baseDateString}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00+09:00`;
    
    // JST時刻文字列からDateオブジェクトを作成（内部的にUTCで保存される）
    return new Date(jstIsoString);
  };

  async findAll(dateString: string) {
    console.log(`Finding schedules for date: ${dateString}`);
    
    try {
      // スタッフ情報を取得
      const staff = await this.prisma.staff.findMany();
      console.log(`Found ${staff.length} staff members`);

      // 2層データ統合システムから取得
      const layeredSchedules = await this.layerManager.getLayeredSchedules(dateString);
      console.log(`Found ${layeredSchedules.length} layered schedules`);

      // LayeredScheduleを従来のSchedule形式に変換
      const schedules = layeredSchedules.map((ls, index) => {
        // 統一された文字列ID生成（フロントエンドとの整合性確保）
        const stringId = `${ls.layer}_${ls.id}_${index}`;
        
        return {
          id: stringId,
          staffId: ls.staffId,
          status: ls.status,
          start: this.utcToJstDecimal(ls.start),
          end: this.utcToJstDecimal(ls.end),
          memo: ls.memo || null,
          editable: ls.layer === 'adjustment', // 調整レイヤーのみ編集可能
          layer: ls.layer // レイヤー情報を追加
        };
      });

      console.log(`Converted to ${schedules.length} schedule records`);
      return { 
        schedules,
        staff: staff.map(s => ({
          id: s.id,
          empNo: s.empNo,
          name: s.name,
          department: s.department,
          group: s.group,
          isActive: s.isActive
        }))
      };
    } catch (error) {
      console.error('Error in findAll:', error);
      // エラー時は従来のScheduleテーブルから取得
      return this.findAllFallback(dateString);
    }
  }

  private async findAllFallback(dateString: string) {
    console.log(`Fallback: Finding schedules from Schedule table for date: ${dateString}`);
    
    // スタッフ情報を取得
    const staff = await this.prisma.staff.findMany();
    console.log(`Found ${staff.length} staff members`);

    // 従来のScheduleテーブルから直接取得
    const startOfDayUtc = new Date(`${dateString}T00:00:00+09:00`);
    const endOfDayUtc = new Date(`${dateString}T23:59:59+09:00`);
    
    const schedules = await this.prisma.schedule.findMany({
      where: {
        start: {
          gte: startOfDayUtc,
          lt: endOfDayUtc
        }
      }
    });
    
    console.log(`Found ${schedules.length} schedules from Schedule table`);

    // Schedule形式に変換
    const convertedSchedules = schedules.map(s => ({
      id: s.id,
      staffId: s.staffId,
      status: s.status,
      start: this.utcToJstDecimal(s.start),
      end: this.utcToJstDecimal(s.end),
      memo: s.memo || null,
      editable: true,
      layer: 'adjustment'
    }));

    return { 
      schedules: convertedSchedules,
      staff: staff.map(s => ({
        id: s.id,
        empNo: s.empNo,
        name: s.name,
        department: s.department,
        group: s.group,
        isActive: s.isActive
      }))
    };
  }

  async create(createScheduleDto: { staffId: number; status: string; start: number; end: number; date: string; memo?: string; }) {
    console.log('Creating schedule with data:', createScheduleDto);
    
    // 時刻変換のデバッグログ（厳格ルール準拠）
    const startUtc = this.jstToUtc(createScheduleDto.start, createScheduleDto.date);
    const endUtc = this.jstToUtc(createScheduleDto.end, createScheduleDto.date);
    console.log(`JST時刻 ${createScheduleDto.start} → UTC時刻 ${startUtc.toISOString()}`);
    console.log(`JST時刻 ${createScheduleDto.end} → UTC時刻 ${endUtc.toISOString()}`);
    
    // 調整レイヤー（Adjustmentテーブル）に保存（2層システム設計に準拠）
    const newSchedule = await this.prisma.adjustment.create({
      data: {
        staffId: createScheduleDto.staffId,
        status: createScheduleDto.status,
        start: startUtc,
        end: endUtc,
        memo: createScheduleDto.memo || null,
        date: new Date(`${createScheduleDto.date}T00:00:00Z`), // 日付フィールド（UTC）
        updatedAt: new Date(), // 必須フィールド
        isPending: false // pending機能以外の通常予定はfalse
      },
    });
    
    console.log('Adjustment created with UTC times:', {
      id: newSchedule.id,
      start: newSchedule.start.toISOString(),
      end: newSchedule.end.toISOString()
    });
    
    // フロントエンド互換性のためJST小数点時刻に変換してレスポンス
    const response = {
      ...newSchedule,
      start: this.utcToJstDecimal(newSchedule.start),
      end: this.utcToJstDecimal(newSchedule.end),
      editable: true,
      layer: 'adjustment'
    };
    
    this.gateway.sendNewSchedule(newSchedule);
    return response;
  }

  async update(id: number, updateScheduleDto: { status?: string; start?: number; end?: number; date: string; memo?: string; }) {
    console.log(`SchedulesService.update called with ID: ${id}, type: ${typeof id}`);
    console.log('UpdateDto:', JSON.stringify(updateScheduleDto));
    
    // IDの妥当性チェック
    if (!id || isNaN(id)) {
      throw new BadRequestException(`無効なID: ${id}`);
    }
    
    // Contractレイヤー（ID範囲: 1000000-1999999）は編集不可
    if (id >= 1000000 && id < 2000000) {
      throw new NotFoundException(`契約レイヤーのスケジュールは編集不可能です (ID: ${id})`);
    }

    try {
      // まずAdjustmentテーブルで試す（調整レイヤー）
      console.log(`Attempting to update in Adjustment table with ID: ${id}`);
      return await this.updateAdjustmentSchedule(id, updateScheduleDto);
    } catch (adjustmentError) {
      console.log(`Not found in Adjustment table, trying Schedule table: ${adjustmentError.message}`);
      
      try {
        // AdjustmentテーブルになければScheduleテーブルで試す（旧データ）
        console.log(`Attempting to update in Schedule table with ID: ${id}`);
        return await this.updateScheduleTable(id, updateScheduleDto);
      } catch (scheduleError) {
        console.error(`Schedule not found in both tables: ${scheduleError.message}`);
        console.warn(`データ不整合の可能性: ID ${id} が表示されているが、データベースに存在しません`);
        throw new NotFoundException(`指定されたスケジュールが見つかりません (ID: ${id})`);
      }
    }
  }

  private async updateScheduleTable(id: number, updateScheduleDto: { status?: string; start?: number; end?: number; date: string; memo?: string; }) {
    const data: { status?: string; start?: Date; end?: Date; memo?: string | null } = {};
    if (updateScheduleDto.status) data.status = updateScheduleDto.status;
    if (updateScheduleDto.start) data.start = this.jstToUtc(updateScheduleDto.start, updateScheduleDto.date);
    if (updateScheduleDto.end) data.end = this.jstToUtc(updateScheduleDto.end, updateScheduleDto.date);
    if (updateScheduleDto.memo !== undefined) data.memo = updateScheduleDto.memo || null;

    // Scheduleテーブルを使用（createと整合性保持）
    const updatedSchedule = await this.prisma.schedule.update({
      where: { id },
      data,
    });
    
    // フロントエンド互換性のためJST小数点時刻に変換してレスポンス
    const response = {
      ...updatedSchedule,
      start: this.utcToJstDecimal(updatedSchedule.start),
      end: this.utcToJstDecimal(updatedSchedule.end),
      editable: true,
      layer: 'adjustment'
    };
    
    this.gateway.sendScheduleUpdated(updatedSchedule);
    return response;
  }

  private async updateAdjustmentSchedule(id: number, updateScheduleDto: { status?: string; start?: number; end?: number; date: string; memo?: string; }) {
    const data: { status?: string; start?: Date; end?: Date; memo?: string | null } = {};
    if (updateScheduleDto.status) data.status = updateScheduleDto.status;
    if (updateScheduleDto.start) data.start = this.jstToUtc(updateScheduleDto.start, updateScheduleDto.date);
    if (updateScheduleDto.end) data.end = this.jstToUtc(updateScheduleDto.end, updateScheduleDto.date);
    if (updateScheduleDto.memo !== undefined) data.memo = updateScheduleDto.memo || null;

    // Adjustmentテーブルを使用
    const updatedSchedule = await this.prisma.adjustment.update({
      where: { id },
      data,
    });
    
    // フロントエンド互換性のためJST小数点時刻に変換してレスポンス
    const response = {
      ...updatedSchedule,
      start: this.utcToJstDecimal(updatedSchedule.start),
      end: this.utcToJstDecimal(updatedSchedule.end),
      editable: true,
      layer: 'adjustment'
    };
    
    this.gateway.sendScheduleUpdated(updatedSchedule);
    return response;
  }

  async remove(id: number | string) {
    console.log(`Attempting to remove schedule with ID: ${id}, type: ${typeof id}`);
    
    // 文字列IDの場合は実際のデータベースIDを抽出
    let actualId: number;
    if (typeof id === 'string') {
      // adjustment_adj_123_0 または adj_123 形式から数値IDを抽出
      if (id.startsWith('adjustment_adj_')) {
        // adjustment_adj_123_0 → 123
        const parts = id.split('_');
        actualId = parseInt(parts[2], 10);
        console.log(`統合ID形式から実際のID抽出: ${id} → ${actualId}`);
      } else if (id.startsWith('adj_')) {
        // adj_123 → 123
        actualId = this.extractScheduleId(id);
        console.log(`調整レイヤーIDから実際のID抽出: ${id} → ${actualId}`);
      } else {
        // その他の文字列ID形式
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
          throw new BadRequestException(`無効なID形式: ${id}`);
        }
        actualId = numericId;
      }
    } else {
      actualId = id;
    }

    // Contractレイヤー（ID範囲: 1000000-1999999）は削除不可
    if (actualId >= 1000000 && actualId < 2000000) {
      throw new NotFoundException(`契約レイヤーのスケジュールは削除不可能です (ID: ${actualId})`);
    }

    console.log(`Using actual ID for deletion: ${actualId}`);
    
    try {
      // 2層システム設計に準拠：新規作成されたスケジュールはAdjustmentテーブルに保存されるため、まずAdjustmentテーブルで試す
      return await this.removeAdjustmentSchedule(actualId);
    } catch (adjustmentError) {
      console.log(`Not found in Adjustment table, trying legacy Schedule table: ${adjustmentError.message}`);
      
      try {
        // AdjustmentテーブルになければScheduleテーブルで試す（旧データの後方互換性）
        return await this.removeScheduleTable(actualId);
      } catch (scheduleError) {
        console.error(`Schedule not found in both tables: ${scheduleError.message}`);
        console.warn(`データ不整合の可能性: ID ${actualId} が表示されているが、データベースに存在しません`);
        // ユーザーには削除成功として扱う（既に存在しないため）
        return { id: actualId, message: 'スケジュールは既に削除済みです' };
      }
    }
  }

  private async removeScheduleTable(id: number) {
    // Scheduleテーブルを使用（createと整合性保持）
    const deletedSchedule = await this.prisma.schedule.delete({
      where: { id },
    });
    
    this.gateway.sendScheduleDeleted(deletedSchedule.id);
    return deletedSchedule;
  }

  private async removeAdjustmentSchedule(id: number) {
    // Adjustmentテーブルを使用
    const deletedSchedule = await this.prisma.adjustment.delete({
      where: { id },
    });
    this.gateway.sendScheduleDeleted(id);
    return deletedSchedule;
  }


  /**
   * レイヤーに基づいてIDを生成
   */
  private generateLayerBasedId(layer: string, layeredId: string, index: number): number {
    if (layer === 'adjustment') {
      return this.extractScheduleId(layeredId);
    }
    
    const hashInput = `${layeredId}_${index}`;
    let hash = 0;
    
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    
    const positiveHash = Math.abs(hash);
    
    if (layer === 'contract') {
      // 契約レイヤー: 1000000-1999999（編集不可）
      return 1000000 + (positiveHash % 1000000);
    } else if (layer === 'monthly') {
      // 月次レイヤー: 100000-999999（編集可能）
      return 100000 + (positiveHash % 900000);
    }
    
    // その他の場合（安全策）
    return positiveHash % 100000;
  }

  /**
   * LayeredScheduleのIDからユニークなIDを生成（後方互換性のため残す）
   */
  private generateUniqueId(layeredId: string, index: number): number {
    const hashInput = `${layeredId}_${index}`;
    let hash = 0;
    
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    
    // 正の数にしてから適切な範囲にマッピング
    const positiveHash = Math.abs(hash);
    return 100000 + (positiveHash % 900000); // 100000-999999の範囲
  }

  /**
   * 調整レイヤーのIDから実際のScheduleIDを抽出
   */
  private extractScheduleId(layeredId: string): number {
    // "adj_123" 形式から数値IDを抽出
    const parts = layeredId.split('_');
    return parseInt(parts[1]) || 0;
  }

  /**
   * UTC Dateオブジェクトを出力用JST ISO文字列に変換（厳格ルール準拠）
   */
  private utcToJstIsoString(utcDate: Date): string {
    // UTC時刻をJSTに変換（+9時間）
    const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    
    const year = jstDate.getFullYear();
    const month = String(jstDate.getMonth() + 1).padStart(2, '0');
    const day = String(jstDate.getDate()).padStart(2, '0');
    const hours = String(jstDate.getHours()).padStart(2, '0');
    const minutes = String(jstDate.getMinutes()).padStart(2, '0');
    const seconds = String(jstDate.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000+09:00`;
  }

  /**
   * UTC時刻を数値のJST時刻に変換（フロントエンド互換性のため）
   */
  private utcToJstDecimal(utcDate: Date): number {
    // UTC時刻をJSTに変換（+9時間）
    const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    
    const hours = jstDate.getHours();
    const minutes = jstDate.getMinutes();
    
    // 小数点時刻に変換（例: 14:30 = 14.5）
    return hours + minutes / 60;
  }

  /**
   * IDで単一スケジュールを取得
   */
  async findOne(id: number) {
    try {
      // まずAdjustmentテーブルから検索
      const adjustment = await this.prisma.adjustment.findUnique({
        where: { id }
      });
      
      if (adjustment) {
        return adjustment;
      }
      
      // Adjustmentにない場合はScheduleテーブルから検索（旧データ用）
      const schedule = await this.prisma.schedule.findUnique({
        where: { id }
      });
      
      return schedule;
    } catch (error) {
      console.error('Error finding schedule:', error);
      throw new NotFoundException('スケジュールが見つかりません');
    }
  }
}