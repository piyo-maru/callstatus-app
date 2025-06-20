import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
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

  // JST入力値を内部UTC時刻に変換（厳格ルール準拠）
  private jstToUtc(decimalHour: number, baseDateString: string): Date {
    const baseDate = new Date(baseDateString);
    const hours = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour % 1) * 60);
    
    // JST時刻をUTCに変換（-9時間）
    // 入力: JST 14:00 → 出力: UTC 05:00
    const jstDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0, 0);
    const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
    return utcDate;
  };

  async findAll(dateString: string) {
    console.log(`Finding schedules for date: ${dateString}`);
    
    // スタッフ情報を取得
    const staff = await this.prisma.staff.findMany();
    console.log(`Found ${staff.length} staff members`);

    // 3層構造のスケジュールを取得
    const layeredSchedules = await this.layerManager.getLayeredSchedules(dateString);
    console.log(`Found ${layeredSchedules.length} layered schedules`);

    // LayeredScheduleを従来のSchedule形式に変換
    const schedules = layeredSchedules.map((ls, index) => ({
      id: this.generateLayerBasedId(ls.layer, ls.id, index),
      staffId: ls.staffId,
      status: this.convertStatusFormat(ls.status),
      start: this.utcToJstIsoString(ls.start),
      end: this.utcToJstIsoString(ls.end),
      memo: ls.memo || null,
      editable: ls.layer === 'adjustment', // 調整レイヤーのみ編集可能
      layer: ls.layer // レイヤー情報を追加
    }));

    console.log(`Converted to ${schedules.length} schedule records`);
    return { staff, schedules };
  }

  async create(createScheduleDto: { staffId: number; status: string; start: number; end: number; date: string; memo?: string; }) {
    const newSchedule = await this.prisma.adjustment.create({
      data: {
        staffId: createScheduleDto.staffId,
        status: createScheduleDto.status,
        start: this.jstToUtc(createScheduleDto.start, createScheduleDto.date),
        end: this.jstToUtc(createScheduleDto.end, createScheduleDto.date),
        date: new Date(createScheduleDto.date),
        memo: createScheduleDto.memo || null,
        reason: 'マニュアル'
      },
    });
    this.gateway.sendNewSchedule(newSchedule);
    return newSchedule;
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
    const data: { status?: string; start?: Date; end?: Date; date?: Date; memo?: string | null } = {};
    if (updateScheduleDto.status) data.status = updateScheduleDto.status;
    if (updateScheduleDto.start) data.start = this.jstToUtc(updateScheduleDto.start, updateScheduleDto.date);
    if (updateScheduleDto.end) data.end = this.jstToUtc(updateScheduleDto.end, updateScheduleDto.date);
    if (updateScheduleDto.date) data.date = new Date(updateScheduleDto.date);
    if (updateScheduleDto.memo !== undefined) data.memo = updateScheduleDto.memo || null;

    const updatedSchedule = await this.prisma.adjustment.update({
      where: { id },
      data,
    });
    this.gateway.sendScheduleUpdated(updatedSchedule);
    return updatedSchedule;
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
    const deletedSchedule = await this.prisma.adjustment.delete({
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
}