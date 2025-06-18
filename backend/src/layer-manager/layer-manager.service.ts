import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface LayeredSchedule {
  id: string;
  staffId: number;
  staffName: string;
  date: string;
  status: string;
  start: Date;
  end: Date;
  memo?: string;
  layer: 'contract' | 'monthly' | 'adjustment';
  source: string;
  canMove: boolean; // ドラッグ&ドロップ移動可能かどうか
}

@Injectable()
export class LayerManagerService {
  constructor(private prisma: PrismaService) {}

  /**
   * 3層データを統合して指定日のスケジュールを取得
   * 優先順位: レイヤー3（個別調整）> レイヤー2（月次）> レイヤー1（契約）
   */
  async getLayeredSchedules(date: string): Promise<LayeredSchedule[]> {
    const targetDate = new Date(date);
    const dayOfWeek = this.getDayOfWeek(targetDate);

    // 全スタッフを取得
    const allStaff = await this.prisma.staff.findMany({
      select: { id: true, name: true }
    });

    const result: LayeredSchedule[] = [];

    for (const staff of allStaff) {
      const layeredSchedules = await this.getStaffLayeredSchedules(
        staff.id,
        targetDate,
        dayOfWeek
      );
      result.push(...layeredSchedules);
    }

    return result.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * 特定スタッフの3層データを統合
   */
  private async getStaffLayeredSchedules(
    staffId: number,
    date: Date,
    dayOfWeek: string
  ): Promise<LayeredSchedule[]> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        contracts: true,
        monthlySchedules: {
          where: {
            date: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
            }
          }
        },
        adjustments: {
          where: {
            date: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
            }
          }
        }
      }
    });

    if (!staff) return [];

    const result: LayeredSchedule[] = [];

    // レイヤー3（個別調整）- 最優先
    const adjustments = staff.adjustments.map(adj => ({
      id: `adj_${adj.id}`,
      staffId: staff.id,
      staffName: staff.name,
      date: date.toISOString().split('T')[0],
      status: adj.status,
      start: adj.start,
      end: adj.end,
      memo: adj.memo,
      layer: 'adjustment' as const,
      source: 'UI操作',
      canMove: adj.status !== 'online' // onlineは移動不可、remoteは移動可能
    }));

    result.push(...adjustments);

    // レイヤー2（月次スケジュール）- 調整で覆われていない時間帯
    const monthlySchedules = staff.monthlySchedules
      .filter(monthly => !this.isTimeRangeCovered(monthly.start, monthly.end, adjustments))
      .map(monthly => ({
        id: `monthly_${monthly.id}`,
        staffId: staff.id,
        staffName: staff.name,
        date: date.toISOString().split('T')[0],
        status: monthly.status,
        start: monthly.start,
        end: monthly.end,
        memo: monthly.memo,
        layer: 'monthly' as const,
        source: monthly.source,
        canMove: monthly.status !== 'online' // onlineは移動不可、remoteは移動可能
      }));

    result.push(...monthlySchedules);

    // レイヤー1（契約）- 上位レイヤーで覆われていない時間帯
    const contract = staff.contracts[0]; // 最新の契約を取得
    if (contract && contract.workDays.includes(dayOfWeek)) {
      const contractSchedules = this.generateContractSchedules(
        staff,
        contract,
        date
      ).filter(contractSched => 
        !this.isTimeRangeCovered(
          contractSched.start,
          contractSched.end,
          [...adjustments, ...monthlySchedules]
        )
      );

      result.push(...contractSchedules);
    }

    return result;
  }

  /**
   * 契約データから基本スケジュールを生成
   */
  private generateContractSchedules(
    staff: any,
    contract: any,
    date: Date
  ): LayeredSchedule[] {
    const result: LayeredSchedule[] = [];
    const [startTime, endTime] = contract.workHours.split('-');
    
    const start = this.parseTimeToDate(date, startTime);
    const end = this.parseTimeToDate(date, endTime);

    // 基本勤務時間（online）
    result.push({
      id: `contract_${contract.id}_work`,
      staffId: staff.id,
      staffName: staff.name,
      date: date.toISOString().split('T')[0],
      status: 'online',
      start,
      end,
      layer: 'contract' as const,
      source: '契約',
      canMove: false // 契約による勤務時間は移動不可
    });

    // 休憩時間（break）
    if (contract.breakHours) {
      const [breakStart, breakEnd] = contract.breakHours.split('-');
      result.push({
        id: `contract_${contract.id}_break`,
        staffId: staff.id,
        staffName: staff.name,
        date: date.toISOString().split('T')[0],
        status: 'break',
        start: this.parseTimeToDate(date, breakStart),
        end: this.parseTimeToDate(date, breakEnd),
        layer: 'contract' as const,
        source: '契約',
        canMove: true // 休憩時間は移動可能
      });
    }

    return result;
  }

  /**
   * 指定時間帯が他のスケジュールで覆われているかチェック
   */
  private isTimeRangeCovered(
    start: Date,
    end: Date,
    schedules: Array<{ start: Date; end: Date }>
  ): boolean {
    return schedules.some(schedule => 
      schedule.start <= start && end <= schedule.end
    );
  }

  /**
   * 曜日を英語3文字で取得
   */
  private getDayOfWeek(date: Date): string {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[date.getDay()];
  }

  /**
   * 時刻文字列（HH:MM）を指定日のDateオブジェクトに変換
   */
  private parseTimeToDate(date: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * 後方互換性のため、既存のScheduleフォーマットに変換
   */
  async getCompatibleSchedules(date: string) {
    const layeredSchedules = await this.getLayeredSchedules(date);
    
    // 既存のAPI形式に変換
    const staff = await this.prisma.staff.findMany({
      select: { id: true, name: true, department: true, group: true }
    });

    const schedules = layeredSchedules.map(schedule => ({
      id: parseInt(schedule.id.split('_')[1]) || 0,
      status: this.convertStatusFormat(schedule.status),
      start: schedule.start.toISOString(),
      end: schedule.end.toISOString(),
      memo: schedule.memo || null,
      staffId: schedule.staffId
    }));

    return { staff, schedules };
  }

  /**
   * ステータス形式を既存形式に変換
   */
  private convertStatusFormat(status: string): string {
    const statusMap = {
      'online': 'Online',
      'remote': 'Remote',
      'meeting': 'Meeting',
      'training': 'Training',
      'break': 'Break',
      'off': 'Off',
      'night_duty': 'Night Duty'
    };
    return statusMap[status] || status;
  }
}