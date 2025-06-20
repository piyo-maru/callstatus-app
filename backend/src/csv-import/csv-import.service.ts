import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CsvScheduleRow {
  date: string;          // 2025-06-17
  empNo: string;         // 0001
  name: string;          // 田中太郎
  status: string;        // online, meeting, training, break, off, night_duty
  timeRange: string;     // 8:30-18:00
  responsibilities?: string; // FAX,件名チェック,カスタム内容 または 昼当番,FAX,CS,カスタム内容
}

export interface CsvImportResult {
  success: boolean;
  imported: number;
  responsibilitiesImported: number;
  conflicts: Array<{
    date: string;
    staff: string;
    csvSchedule: { type: string; time: string };
    existingSchedule: { type: string; time: string; layer: string };
    result: string;
  }>;
  errors: string[];
}

@Injectable()
export class CsvImportService {
  constructor(private prisma: PrismaService) {}

  /**
   * 部署による担当設定タイプを判定
   */
  private isReceptionDepartment(department: string): boolean {
    return department.includes('受付');
  }

  /**
   * CSVデータをパースしてAdjustment（レイヤー2）に投入
   */
  async importCsvSchedules(csvContent: string): Promise<CsvImportResult> {
    console.log('Starting CSV import process...');
    
    const result: CsvImportResult = {
      success: true,
      imported: 0,
      responsibilitiesImported: 0,
      conflicts: [],
      errors: []
    };

    try {
      // CSVをパース
      const rows = this.parseCsv(csvContent);
      console.log(`Parsed ${rows.length} CSV rows`);

      // 各行を処理
      for (const row of rows) {
        try {
          await this.processScheduleRow(row, result);
        } catch (error) {
          result.errors.push(`行の処理でエラー: ${row.date}, ${row.name}, ${error.message}`);
          console.error(`Error processing row for ${row.name}:`, error);
        }
      }

      result.success = result.errors.length === 0;
      console.log('CSV import completed:', result);
      return result;

    } catch (error) {
      console.error('CSV import failed:', error);
      throw new BadRequestException(`CSV投入に失敗しました: ${error.message}`);
    }
  }

  /**
   * CSV文字列をパースしてオブジェクト配列に変換
   */
  private parseCsv(csvContent: string): CsvScheduleRow[] {
    const lines = csvContent.trim().split('\n');
    const rows: CsvScheduleRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // 空行をスキップ

      const columns = line.split(',').map(col => col.trim());
      
      if (columns.length !== 5 && columns.length !== 6) {
        throw new Error(`${i + 1}行目: 列数が正しくありません (期待: 5列または6列, 実際: ${columns.length}列)`);
      }

      const [date, empNo, name, status, timeRange, responsibilities] = columns;

      // バリデーション
      if (!this.isValidDate(date)) {
        throw new Error(`${i + 1}行目: 日付形式が正しくありません: ${date}`);
      }

      // ステータスと時間は両方指定されているか、両方空欄である必要がある
      const hasStatus = status && status.trim();
      const hasTimeRange = timeRange && timeRange.trim();
      
      if (hasStatus && hasTimeRange) {
        // 両方指定されている場合：バリデーションを行う
        if (!this.isValidStatus(status)) {
          throw new Error(`${i + 1}行目: 無効なステータス: ${status}`);
        }
        if (!this.isValidTimeRange(timeRange)) {
          throw new Error(`${i + 1}行目: 時間形式が正しくありません: ${timeRange}`);
        }
      } else if (hasStatus || hasTimeRange) {
        // どちらか一方だけ指定されている場合：エラー
        throw new Error(`${i + 1}行目: ステータスと時間は両方指定するか、両方空欄にしてください`);
      }
      // 両方空欄の場合：担当設定のみの投入として処理

      rows.push({ date, empNo, name, status, timeRange, responsibilities });
    }

    return rows;
  }

  /**
   * 個別のスケジュール行を処理
   */
  private async processScheduleRow(row: CsvScheduleRow, result: CsvImportResult) {
    // 社員番号からスタッフを検索
    const contract = await this.prisma.contract.findUnique({
      where: { empNo: row.empNo },
      include: { staff: true }
    });

    if (!contract) {
      throw new Error(`社員番号 ${row.empNo} に対応する契約データが見つかりません`);
    }

    const staff = contract.staff;
    const scheduleDate = new Date(row.date);
    
    // スケジュール投入（ステータスと時間が両方とも指定されている場合のみ）
    if (row.status && row.status.trim() && row.timeRange && row.timeRange.trim()) {
      const { startTime, endTime } = this.parseTimeRangeToUtc(row.timeRange, scheduleDate);

      // 既存の同一時間帯Adjustmentデータを削除（後勝ちロジック）
      await this.prisma.adjustment.deleteMany({
        where: {
          staffId: staff.id,
          date: scheduleDate,
          start: startTime,
          end: endTime
        }
      });

      // 新しいAdjustmentデータを作成（月次投入として）
      await this.prisma.adjustment.create({
        data: {
          staffId: staff.id,
          date: scheduleDate,
          status: row.status,
          start: startTime,
          end: endTime,
          reason: 'CSV投入'
        }
      });

      result.imported++;
      console.log(`Imported schedule for ${row.name}: ${row.status} ${row.timeRange}`);
    }
    
    // 担当設定がある場合は処理
    if (row.responsibilities && row.responsibilities.trim()) {
      try {
        await this.processResponsibilities(staff, scheduleDate, row.responsibilities);
        result.responsibilitiesImported++;
        console.log(`Imported responsibilities for ${row.name}: ${row.responsibilities}`);
      } catch (error) {
        console.error(`Failed to import responsibilities for ${row.name}:`, error);
        result.errors.push(`担当設定の投入でエラー: ${row.name}, ${error.message}`);
      }
    }
  }

  /**
   * 日付形式の検証（YYYY-MM-DD）
   */
  private isValidDate(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
  }

  /**
   * ステータスの検証
   */
  private isValidStatus(status: string): boolean {
    const validStatuses = ['online', 'remote', 'meeting', 'training', 'break', 'off', 'unplanned', 'night_duty'];
    return validStatuses.includes(status);
  }

  /**
   * 時間範囲の検証（HH:MM-HH:MM）
   */
  private isValidTimeRange(timeRange: string): boolean {
    const timeRegex = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;
    if (!timeRegex.test(timeRange)) return false;

    const [startStr, endStr] = timeRange.split('-');
    const start = this.parseTime(startStr);
    const end = this.parseTime(endStr);
    
    return start !== null && end !== null && start < end;
  }

  /**
   * 時間文字列をUTC Dateオブジェクトに変換（厳格ルール準拠）
   */
  private parseTimeRangeToUtc(timeRange: string, date: Date): { startTime: Date; endTime: Date } {
    const [startStr, endStr] = timeRange.split('-');
    
    const [startHour, startMin] = startStr.split(':').map(Number);
    const [endHour, endMin] = endStr.split(':').map(Number);
    
    // JST時刻をUTCに変換（-9時間）
    const startJst = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      startHour,
      startMin,
      0,
      0
    );
    
    const endJst = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      endHour,
      endMin,
      0,
      0
    );
    
    const startTime = new Date(startJst.getTime() - 9 * 60 * 60 * 1000);
    const endTime = new Date(endJst.getTime() - 9 * 60 * 60 * 1000);
    
    return { startTime, endTime };
  }

  /**
   * 時間文字列をパース（HH:MM）
   */
  private parseTime(timeStr: string): number | null {
    const [hour, minute] = timeStr.split(':').map(Number);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  /**
   * DateオブジェクトをHH:MM形式に変換
   */
  private formatTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * 担当設定を処理（部署別対応）
   */
  private async processResponsibilities(staff: any, date: Date, responsibilitiesStr: string) {
    const isReception = this.isReceptionDepartment(staff.department);
    const responsibilities = responsibilitiesStr.split(',').map(r => r.trim());
    
    let responsibilityData: any;
    
    if (isReception) {
      // 受付部署: 昼当番,FAX,CS,カスタム内容
      responsibilityData = {
        lunch: responsibilities.includes('昼当番'),
        fax: responsibilities.includes('FAX'),
        cs: responsibilities.includes('CS'),
        custom: responsibilities.find(r => !['昼当番', 'FAX', 'CS'].includes(r)) || ''
      };
    } else {
      // 一般部署: FAX,件名チェック,カスタム内容
      responsibilityData = {
        fax: responsibilities.includes('FAX'),
        subjectCheck: responsibilities.includes('件名チェック'),
        custom: responsibilities.find(r => !['FAX', '件名チェック'].includes(r)) || ''
      };
    }
    
    // 既存の担当設定を削除（上書き）
    await this.prisma.staffResponsibility.deleteMany({
      where: {
        staffId: staff.id,
        date: date
      }
    });
    
    // 新しい担当設定を作成
    await this.prisma.staffResponsibility.create({
      data: {
        staffId: staff.id,
        date: date,
        responsibilities: responsibilityData
      }
    });
  }
}