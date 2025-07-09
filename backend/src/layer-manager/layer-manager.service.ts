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
  isApprovedPending?: boolean; // 承認済みpendingスケジュールフラグ
  createdAt: Date;
  updatedAt: Date;
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
    const schedules: LayeredSchedule[] = [];

    try {
      // レイヤー1: 契約による基本勤務時間を生成
      const contractSchedules = await this.generateContractSchedules(dateString);
      schedules.push(...contractSchedules);

      // レイヤー2: 個別調整予定を取得
      const adjustmentSchedules = await this.getAdjustmentSchedules(dateString);
      schedules.push(...adjustmentSchedules);

      // 従来のScheduleテーブルからも取得（後方互換性のため）
      const legacySchedules = await this.getLegacySchedules(dateString);
      schedules.push(...legacySchedules);

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
    
    // 指定日付の曜日を取得（UTC基準で厳密に処理）
    const date = new Date(`${dateString}T00:00:00.000Z`);
    const dayOfWeek = date.getUTCDay(); // 0=日曜, 1=月曜, ..., 6=土曜
    
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
    
    // 全ての契約データを取得してフィルタリング（論理削除対応: アクティブ社員のみ）
    const allContracts = await this.prisma.contract.findMany({
      include: {
        Staff: true
      }
    });
    
    // 該当曜日に勤務時間が設定されている契約をフィルタ（アクティブ社員のみ）
    const contracts = allContracts.filter(contract => {
      const workHours = contract[dayColumn as keyof typeof contract];
      return workHours !== null && workHours !== undefined && workHours !== '' && 
             contract.Staff.isActive;  // アクティブ社員のみ対象
    });

    // 各契約から勤務時間スケジュールを生成
    for (const contract of contracts) {
      const workHours = contract[dayColumn] as string;
      if (!workHours) continue;

      const schedule = this.parseWorkHours(workHours, dateString, contract.staffId, contract.empNo);
      if (schedule) {
        schedules.push(schedule);
      }
    }

    return schedules;
  }

  /**
   * 勤務時間文字列("09:00-18:00")をLayeredScheduleに変換
   */
  private parseWorkHours(workHours: string, dateString: string, staffId: number, empNo: string): LayeredSchedule | null {
    // 1桁または2桁の時間に対応した正規表現
    const timeRange = workHours.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    if (!timeRange) {
      console.error(`LayerManager: Failed to parse work hours: "${workHours}" for ${empNo}`);
      return null;
    }

    const [, startTime, endTime] = timeRange;
    
    // 時刻を2桁にパディング（例：8:00 → 08:00）
    const padTime = (time: string) => {
      const [hour, minute] = time.split(':');
      return `${hour.padStart(2, '0')}:${minute}`;
    };
    
    const paddedStartTime = padTime(startTime);
    const paddedEndTime = padTime(endTime);
    
    // JST時刻をUTCに変換（ISO-8601準拠）
    const startUtc = new Date(`${dateString}T${paddedStartTime}:00+09:00`);
    const endUtc = new Date(`${dateString}T${paddedEndTime}:00+09:00`);

    return {
      id: `contract_${empNo}_${dateString}`,
      staffId,
      status: 'online', // 契約による基本勤務時間はonlineとして表示
      start: startUtc,
      end: endUtc,
      memo: '契約による基本勤務時間',
      layer: 'contract',
      priority: 1, // 契約レイヤーは最低優先度
      createdAt: startUtc, // 契約スケジュールは当日作成として扱う
      updatedAt: startUtc  // 契約スケジュールは基本的に更新されない
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


    return adjustments.map(adj => {
      const adjustmentSchedule: LayeredSchedule = {
        id: `adj_${adj.id}`,
        staffId: adj.staffId,
        status: adj.status,
        start: adj.start,
        end: adj.end,
        memo: adj.memo || undefined,
        layer: 'adjustment' as const,
        priority: 3, // 個別調整は最高優先度
        isApprovedPending: adj.isPending && adj.approvedAt !== null, // 承認済みpendingかどうか
        createdAt: adj.createdAt,
        updatedAt: adj.updatedAt
      };
      return adjustmentSchedule;
    });
  }

  /**
   * 過去日付用: 契約による基本勤務時間を生成（退職者含む）
   */
  async generateHistoricalContractSchedules(dateString: string): Promise<LayeredSchedule[]> {
    const schedules: LayeredSchedule[] = [];
    
    // 指定日付の曜日を取得（UTC基準で厳密に処理）
    const date = new Date(`${dateString}T00:00:00.000Z`);
    const dayOfWeek = date.getUTCDay(); // 0=日曜, 1=月曜, ..., 6=土曜
    
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
    
    // 論理削除対応: アクティブ社員の契約データのみを取得
    const allContracts = await this.prisma.contract.findMany({
      include: {
        Staff: true // スタッフ情報も取得（アクティブ社員判定用）
      }
    });
    
    // 該当曜日に勤務時間が設定されている契約をフィルタ（アクティブ社員のみ）
    const contracts = allContracts.filter(contract => {
      const workHours = contract[dayColumn as keyof typeof contract];
      return workHours !== null && workHours !== undefined && workHours !== '' && 
             contract.Staff.isActive;  // アクティブ社員のみ対象
    });

    // 各契約から勤務時間スケジュールを生成
    for (const contract of contracts) {
      const workHours = contract[dayColumn] as string;
      if (!workHours) continue;

      // "09:00-18:00" 形式をパース
      const schedule = this.parseWorkHours(workHours, dateString, contract.staffId, contract.empNo);
      if (schedule) {
        schedules.push(schedule);
      }
    }

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
        priority: 2, // 従来データは中間優先度
        createdAt: sch.start, // ScheduleテーブルにはcreatedAtがないため、startを使用
        updatedAt: sch.start  // ScheduleテーブルにはupdatedAtがないため、startを使用
      };
      return legacySchedule;
    });
  }
}