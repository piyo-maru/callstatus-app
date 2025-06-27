import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface LayeredSchedule {
  id: string;
  staffId: number;
  status: string;
  start: Date;
  end: Date;
  memo?: string;
  layer: 'contract' | 'adjustment';
  priority: number;
}

@Injectable()
export class LayerManagerService {
  constructor(private prisma: PrismaService) {}

  /**
   * 指定日付の2層統合スケジュールを取得
   * レイヤー1: 契約による基本勤務時間
   * レイヤー2: 個別調整・例外予定
   */
  async getLayeredSchedules(dateString: string): Promise<LayeredSchedule[]> {
    console.log(`LayerManager: Getting layered schedules for ${dateString}`);
    const schedules: LayeredSchedule[] = [];

    try {
      // レイヤー1: 契約による基本勤務時間を生成
      console.log('LayerManager: Generating contract schedules...');
      const contractSchedules = await this.generateContractSchedules(dateString);
      console.log(`LayerManager: Generated ${contractSchedules.length} contract schedules`);
      schedules.push(...contractSchedules);

      // レイヤー2: 個別調整予定を取得
      console.log('LayerManager: Getting adjustment schedules...');
      const adjustmentSchedules = await this.getAdjustmentSchedules(dateString);
      console.log(`LayerManager: Found ${adjustmentSchedules.length} adjustment schedules`);
      schedules.push(...adjustmentSchedules);

      // 従来のScheduleテーブルからも取得（後方互換性のため）
      console.log('LayerManager: Getting legacy schedules...');
      const legacySchedules = await this.getLegacySchedules(dateString);
      console.log(`LayerManager: Found ${legacySchedules.length} legacy schedules`);
      schedules.push(...legacySchedules);

      console.log(`LayerManager: Total schedules: ${schedules.length}`);
      return schedules;
    } catch (error) {
      console.error('LayerManager: Error in getLayeredSchedules:', error);
      throw error;
    }
  }

  /**
   * レイヤー1: 契約による基本勤務時間を生成
   */
  async generateContractSchedules(dateString: string): Promise<LayeredSchedule[]> {
    const schedules: LayeredSchedule[] = [];
    
    // 指定日付の曜日を取得
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
    console.log(`LayerManager: Date ${dateString} is day ${dayOfWeek} (0=Sunday)`);
    
    // 曜日名をContractテーブルのカラム名にマッピング
    const dayColumns = [
      'sundayHours',    // 0: 日曜
      'mondayHours',    // 1: 月曜
      'tuesdayHours',   // 2: 火曜
      'wednesdayHours', // 3: 水曜
      'thursdayHours',  // 4: 木曜
      'fridayHours',    // 5: 金曜
      'saturdayHours'   // 6: 土曜
    ];
    
    const dayColumn = dayColumns[dayOfWeek];
    console.log(`LayerManager: Looking for ${dayColumn} in contracts`);
    
    // 全ての契約データを取得してフィルタリング
    const allContracts = await this.prisma.contract.findMany();
    console.log(`LayerManager: Found ${allContracts.length} total contracts`);
    
    // 該当曜日に勤務時間が設定されている契約をフィルタ
    const contracts = allContracts.filter(contract => {
      const workHours = contract[dayColumn as keyof typeof contract];
      console.log(`LayerManager: Contract ${contract.empNo} (${contract.name}) - ${dayColumn}: ${workHours}`);
      return workHours !== null && workHours !== undefined && workHours !== '';
    });
    console.log(`LayerManager: Found ${contracts.length} contracts with ${dayColumn} set`);

    // 各契約から勤務時間スケジュールを生成
    for (const contract of contracts) {
      const workHours = contract[dayColumn] as string;
      if (!workHours) continue;

      console.log(`LayerManager: Processing contract ${contract.empNo} with hours: ${workHours}`);
      // "09:00-18:00" 形式をパース
      const schedule = this.parseWorkHours(workHours, dateString, contract.staffId, contract.empNo);
      if (schedule) {
        console.log(`LayerManager: Generated schedule for ${contract.empNo}: ${schedule.start.toISOString()} - ${schedule.end.toISOString()}`);
        schedules.push(schedule);
      }
    }

    console.log(`LayerManager: Generated ${schedules.length} contract schedules`);
    return schedules;
  }

  /**
   * 勤務時間文字列("09:00-18:00")をLayeredScheduleに変換
   */
  private parseWorkHours(workHours: string, dateString: string, staffId: number, empNo: string): LayeredSchedule | null {
    const timeRange = workHours.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!timeRange) return null;

    const [, startTime, endTime] = timeRange;
    
    // JST時刻をUTCに変換（ISO-8601準拠）
    const startUtc = new Date(`${dateString}T${startTime}:00+09:00`);
    const endUtc = new Date(`${dateString}T${endTime}:00+09:00`);

    return {
      id: `contract_${empNo}_${dateString}`,
      staffId,
      status: 'online', // 契約による基本勤務時間はonlineとして表示
      start: startUtc,
      end: endUtc,
      memo: '契約による基本勤務時間',
      layer: 'contract',
      priority: 1 // 契約レイヤーは最低優先度
    };
  }

  /**
   * レイヤー2: 個別調整予定を取得
   */
  private async getAdjustmentSchedules(dateString: string): Promise<LayeredSchedule[]> {
    const startOfDayUtc = new Date(`${dateString}T00:00:00+09:00`);
    const endOfDayUtc = new Date(`${dateString}T23:59:59+09:00`);

    const adjustments = await this.prisma.adjustment.findMany({
      where: {
        start: {
          gte: startOfDayUtc,
          lt: endOfDayUtc
        },
        // 承認済みの調整のみを取得（未承認pending予定は除外）
        NOT: {
          AND: [
            { isPending: true },
            { approvedAt: null }
          ]
        }
      }
    });

    console.log(`LayerManager: Found ${adjustments.length} adjustments for ${dateString}`);
    adjustments.forEach(adj => {
      console.log(`LayerManager: Adjustment ID ${adj.id}, staffId ${adj.staffId}, status ${adj.status}, start ${adj.start.toISOString()}`);
    });

    return adjustments.map(adj => {
      const adjustmentSchedule: LayeredSchedule = {
        id: `adj_${adj.id}`,
        staffId: adj.staffId,
        status: adj.status,
        start: adj.start,
        end: adj.end,
        memo: adj.memo || undefined,
        layer: 'adjustment' as const,
        priority: 3 // 個別調整は最高優先度
      };
      console.log(`Adjustment schedule created: ID ${adjustmentSchedule.id}, staffId ${adj.staffId}, database ID: ${adj.id}`);
      return adjustmentSchedule;
    });
  }

  /**
   * 過去日付用: 契約による基本勤務時間を生成（退職者含む）
   */
  async generateHistoricalContractSchedules(dateString: string): Promise<LayeredSchedule[]> {
    const schedules: LayeredSchedule[] = [];
    
    // 指定日付の曜日を取得
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
    console.log(`LayerManager: [Historical] Date ${dateString} is day ${dayOfWeek} (0=Sunday)`);
    
    // 曜日名をContractテーブルのカラム名にマッピング
    const dayColumns = [
      'sundayHours',    // 0: 日曜
      'mondayHours',    // 1: 月曜
      'tuesdayHours',   // 2: 火曜
      'wednesdayHours', // 3: 水曜
      'thursdayHours',  // 4: 木曜
      'fridayHours',    // 5: 金曜
      'saturdayHours'   // 6: 土曜
    ];
    
    const dayColumn = dayColumns[dayOfWeek];
    console.log(`LayerManager: [Historical] Looking for ${dayColumn} in contracts`);
    
    // 退職者を含む全ての契約データを取得
    const allContracts = await this.prisma.contract.findMany({
      include: {
        Staff: true // スタッフ情報も取得（退職者判定用）
      }
    });
    console.log(`LayerManager: [Historical] Found ${allContracts.length} total contracts (including retired staff)`);
    
    // 該当曜日に勤務時間が設定されている契約をフィルタ
    const contracts = allContracts.filter(contract => {
      const workHours = contract[dayColumn as keyof typeof contract];
      console.log(`LayerManager: [Historical] Contract ${contract.empNo} (${contract.name}) - ${dayColumn}: ${workHours}, Staff Active: ${contract.Staff?.isActive}`);
      return workHours !== null && workHours !== undefined && workHours !== '';
    });
    console.log(`LayerManager: [Historical] Found ${contracts.length} contracts with ${dayColumn} set`);

    // 各契約から勤務時間スケジュールを生成
    for (const contract of contracts) {
      const workHours = contract[dayColumn] as string;
      if (!workHours) continue;

      console.log(`LayerManager: [Historical] Processing contract ${contract.empNo} with hours: ${workHours}`);
      // "09:00-18:00" 形式をパース
      const schedule = this.parseWorkHours(workHours, dateString, contract.staffId, contract.empNo);
      if (schedule) {
        console.log(`LayerManager: [Historical] Generated schedule for ${contract.empNo}: ${schedule.start.toISOString()} - ${schedule.end.toISOString()}`);
        schedules.push(schedule);
      }
    }

    console.log(`LayerManager: [Historical] Generated ${schedules.length} historical contract schedules`);
    return schedules;
  }

  /**
   * 従来のScheduleテーブルから取得（後方互換性のため）
   */
  private async getLegacySchedules(dateString: string): Promise<LayeredSchedule[]> {
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

    return schedules.map(sch => {
      const legacySchedule: LayeredSchedule = {
        id: `sch_${sch.id}`,
        staffId: sch.staffId,
        status: sch.status,
        start: sch.start,
        end: sch.end,
        memo: sch.memo || undefined,
        layer: 'adjustment' as const,
        priority: 2 // 従来データは中間優先度
      };
      console.log(`Legacy schedule created: ID ${legacySchedule.id}, staffId ${sch.staffId}`);
      return legacySchedule;
    });
  }
}