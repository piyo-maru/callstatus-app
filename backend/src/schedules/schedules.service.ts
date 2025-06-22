import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SchedulesGateway } from './schedules.gateway';
// import { LayerManagerService } from '../layer-manager/layer-manager.service'; // 一時的に無効化

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SchedulesGateway))
    private readonly gateway: SchedulesGateway,
    // private layerManager: LayerManagerService, // 一時的に無効化
  ) {}

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
    
    // スタッフ情報を取得
    const staff = await this.prisma.staff.findMany();
    console.log(`Found ${staff.length} staff members`);

    // 一時的にScheduleテーブルから直接取得（LayerManagerService無効化のため）
    // JST日付範囲をUTC時刻で表現（厳格ルール準拠）
    const startOfDayUtc = new Date(`${dateString}T00:00:00+09:00`); // JST 00:00 = UTC前日15:00
    const endOfDayUtc = new Date(`${dateString}T23:59:59+09:00`);   // JST 23:59 = UTC当日14:59
    
    console.log(`Date range for query:`, {
      dateString,
      startOfDayUtc: startOfDayUtc.toISOString(),
      endOfDayUtc: endOfDayUtc.toISOString()
    });
    
    const schedules = await this.prisma.schedule.findMany({
      where: {
        start: {
          gte: startOfDayUtc,
          lt: endOfDayUtc
        }
      }
    });
    
    console.log(`Found ${schedules.length} schedules from Schedule table`);
    if (schedules.length > 0) {
      console.log('First schedule:', {
        id: schedules[0].id,
        start: schedules[0].start.toISOString(),
        end: schedules[0].end.toISOString()
      });
    }

    // Schedule形式に変換
    const convertedSchedules = schedules.map(s => ({
      id: s.id,
      staffId: s.staffId,
      status: this.convertStatusFormat(s.status),
      start: this.utcToJstDecimal(s.start),
      end: this.utcToJstDecimal(s.end),
      memo: s.memo || null,
      editable: true, // 従来のScheduleテーブルは編集可能
      layer: 'adjustment' // デフォルトで調整レイヤー扱い
    }));

    console.log(`Converted to ${convertedSchedules.length} schedule records`);
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
    
    // 一時的にScheduleテーブルを使用（本来はAdjustmentテーブルに保存すべき）
    const newSchedule = await this.prisma.schedule.create({
      data: {
        staffId: createScheduleDto.staffId,
        status: createScheduleDto.status.toLowerCase(), // 小文字で保存
        start: startUtc,
        end: endUtc,
        memo: createScheduleDto.memo || null
      },
    });
    
    console.log('Schedule created with UTC times:', {
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
    // Contractレイヤー（ID範囲: 1000000-1999999）は編集不可
    if (id >= 1000000 && id < 2000000) {
      throw new NotFoundException(`契約レイヤーのスケジュールは編集不可能です (ID: ${id})`);
    }

    // 調整レイヤー（Adjustment）の更新のみ対応
    return this.updateAdjustmentSchedule(id, updateScheduleDto);
  }


  private async updateAdjustmentSchedule(id: number, updateScheduleDto: { status?: string; start?: number; end?: number; date: string; memo?: string; }) {
    const data: { status?: string; start?: Date; end?: Date; memo?: string | null } = {};
    if (updateScheduleDto.status) data.status = updateScheduleDto.status.toLowerCase(); // 小文字で保存
    if (updateScheduleDto.start) data.start = this.jstToUtc(updateScheduleDto.start, updateScheduleDto.date);
    if (updateScheduleDto.end) data.end = this.jstToUtc(updateScheduleDto.end, updateScheduleDto.date);
    if (updateScheduleDto.memo !== undefined) data.memo = updateScheduleDto.memo || null;

    // 一時的にScheduleテーブルを使用（LayerManagerService無効化のため）
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

  async remove(id: number) {
    // Contractレイヤー（ID範囲: 1000000-1999999）は削除不可
    if (id >= 1000000 && id < 2000000) {
      throw new NotFoundException(`契約レイヤーのスケジュールは削除不可能です (ID: ${id})`);
    }

    // 調整レイヤー（Adjustment）の削除のみ対応
    return this.removeAdjustmentSchedule(id);
  }


  private async removeAdjustmentSchedule(id: number) {
    // 一時的にScheduleテーブルを使用（LayerManagerService無効化のため）
    const deletedSchedule = await this.prisma.schedule.delete({
      where: { id },
    });
    this.gateway.sendScheduleDeleted(id);
    return deletedSchedule;
  }

  /**
   * ステータス形式をフロントエンド向けに変換
   */
  private convertStatusFormat(status: string): string {
    const statusMap = {
      'online': 'Online',
      'remote': 'Remote', 
      'meeting': 'Meeting',
      'training': 'Training',
      'break': 'Break',
      'off': 'Off',
      'unplanned': 'Unplanned',
      'night_duty': 'Night Duty'
    };
    return statusMap[status] || status;
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