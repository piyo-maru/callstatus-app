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
  layer: 'contract' | 'adjustment';
  source: string;
  canMove: boolean; // ドラッグ&ドロップ移動可能かどうか
}

@Injectable()
export class LayerManagerService {
  constructor(private prisma: PrismaService) {}

  /**
   * 2層データを統合して指定日のスケジュールを取得
   * 優先順位: レイヤー2（個別調整）> レイヤー1（契約）
   */
  // 互換性レイヤー: レイヤー統合スケジュール取得
  async getCompatibleSchedules(date: string) {
    console.log(`LayerManager: Getting layered schedules for ${date}`);
    
    // 2層統合スケジュールを取得
    const layeredSchedules = await this.getLayeredSchedules(date);
    
    // 契約があるアクティブなスタッフのみを取得
    const staff = await this.prisma.staff.findMany({
      where: { isActive: true },
      include: {
        contracts: true
      }
    });
    
    // 契約があるスタッフのみにフィルタリング
    const staffWithContracts = staff.filter(s => s.contracts.length > 0).map(s => ({
      id: s.id,
      name: s.name,
      department: s.department,
      group: s.group,
      currentStatus: 'Unknown'
    }));
    

    // 既存のAPI形式に変換
    const schedules = layeredSchedules.map(schedule => ({
      id: parseInt(schedule.id.split('_')[1]) || Math.floor(Math.random() * 1000000),
      staffId: schedule.staffId,
      status: this.convertStatusFormat(schedule.status),
      start: schedule.start.toISOString(),
      end: schedule.end.toISOString(),
      memo: schedule.memo || null,
      layer: schedule.layer,
      canMove: schedule.canMove
    }));

    console.log(`LayerManager: Generated ${schedules.length} schedules (${schedules.filter(s => s.layer === 'contract').length} contract, ${schedules.filter(s => s.layer === 'adjustment').length} adjustment)`);

    return {
      staff: staffWithContracts,
      schedules
    };
  }

  async getLayeredSchedules(date: string): Promise<LayeredSchedule[]> {
    // 入力層: JST日付文字列を受け取り、JST基準で曜日判定
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day); // JST基準の日付
    const dayOfWeek = this.getDayOfWeek(targetDate);
    
    console.log(`LayerManager: Processing ${date}, dayOfWeek: ${dayOfWeek}, targetDate: ${targetDate.toISOString()}`);

    // 契約があるスタッフのみを取得
    const allStaffData = await this.prisma.staff.findMany({
      include: {
        contracts: true
      }
    });
    
    const allStaff = allStaffData
      .filter(s => s.contracts.length > 0)
      .map(s => ({ id: s.id, name: s.name }));

    console.log(`LayerManager: Contract staff count: ${allStaff.length}`);

    const result: LayeredSchedule[] = [];

    for (const staff of allStaff) {
      const layeredSchedules = await this.getStaffLayeredSchedules(
        staff.id,
        targetDate,
        dayOfWeek,
        date
      );
      result.push(...layeredSchedules);
    }

    return result.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * 特定スタッフの2層データを統合
   */
  private async getStaffLayeredSchedules(
    staffId: number,
    date: Date,
    dayOfWeek: string,
    dateString: string
  ): Promise<LayeredSchedule[]> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        contracts: true,
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

    // レイヤー2（個別調整）- 最優先（月次投入＋手動調整）
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
      source: adj.reason || 'マニュアル',
      canMove: true // 個別調整は移動可能
    }));

    result.push(...adjustments);

    // レイヤー1（契約）- 常に表示（透明度50%で表示）
    const contract = staff.contracts[0]; // 最新の契約を取得
    if (contract) {
      const contractSchedules = this.generateContractSchedules(
        staff,
        contract,
        date,
        dateString
      );

      result.push(...contractSchedules);
    }

    return result;
  }

  /**
   * 契約データから基本スケジュールを生成（曜日別対応）
   */
  private generateContractSchedules(
    staff: any,
    contract: any,
    date: Date,
    dateString: string
  ): LayeredSchedule[] {
    const result: LayeredSchedule[] = [];
    
    // 曜日を取得（英語3文字）
    const dayOfWeek = this.getDayOfWeek(date);
    
    // 曜日別の勤務時間を取得
    const dayHoursMap = {
      'sun': contract.sundayHours,
      'mon': contract.mondayHours,
      'tue': contract.tuesdayHours,
      'wed': contract.wednesdayHours,
      'thu': contract.thursdayHours,
      'fri': contract.fridayHours,
      'sat': contract.saturdayHours
    };
    
    const dayHours = dayHoursMap[dayOfWeek];
    
    // 該当曜日の勤務時間が設定されている場合のみスケジュールを生成
    if (dayHours) {
      console.log(`  ${staff.name}: ${dayOfWeek} = ${dayHours}`);
      const [startTime, endTime] = dayHours.split('-');
      
      const start = this.parseTimeToUtc(dateString, startTime);
      const end = this.parseTimeToUtc(dateString, endTime);

      // 基本勤務時間（online）
      result.push({
        id: `contract_${contract.id}_${dayOfWeek}`,
        staffId: staff.id,
        staffName: staff.name,
        date: dateString,
        status: 'online',
        start,
        end,
        layer: 'contract' as const,
        source: '契約',
        canMove: false // 契約による勤務時間は移動不可
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
   * 時刻文字列（HH:MM）をUTC Dateオブジェクトに変換
   * CLAUDE.md厳格ルール準拠: JST→UTC変換
   */
  private parseTimeToUtc(baseDateString: string, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // JST時刻文字列を作成してUTCに変換
    const jstIsoString = `${baseDateString}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000+09:00`;
    
    return new Date(jstIsoString);
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