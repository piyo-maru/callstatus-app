import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { v4 as uuidv4 } from 'uuid';

interface CsvScheduleData {
  empNo: string;
  date: string;
  name?: string;
  status: string;
  time: string;
  memo?: string;
  assignmentType?: string;
  customLabel?: string;
}

@Injectable()
export class CsvImportService {
  constructor(private prisma: PrismaService) {}

  async importSchedules(schedules: CsvScheduleData[]) {
    console.log(`Starting CSV import for ${schedules.length} schedules`);
    
    const batchId = uuidv4();
    const results = {
      success: true,
      batchId,
      imported: 0,
      skipped: 0,
      errors: [],
      details: []
    };

    try {
      for (const schedule of schedules) {
        try {
          console.log(`Processing schedule for ${schedule.empNo} on ${schedule.date}`);
          
          // スタッフ存在確認
          const staff = await this.prisma.staff.findUnique({
            where: { empNo: schedule.empNo }
          });

          if (!staff) {
            console.log(`Staff not found: ${schedule.empNo}`);
            results.skipped++;
            results.details.push({
              empNo: schedule.empNo,
              error: 'スタッフが見つかりません',
              action: 'スキップ'
            });
            continue;
          }

          // スケジュール情報がある場合のみAdjustmentテーブルに挿入
          if (schedule.status && schedule.time && schedule.status.trim() !== '' && schedule.time.trim() !== '') {
            // 時刻変換（"HH:MM-HH:MM" → 開始・終了時刻）
            const { startTime, endTime } = this.parseTimeRange(schedule.time);
            const startUtc = this.parseTimeToUtc(startTime, schedule.date);
            const endUtc = this.parseTimeToUtc(endTime, schedule.date);

            console.log(`Creating adjustment: ${schedule.empNo} ${schedule.date} ${schedule.status} ${schedule.time}`);

            // Adjustmentテーブルに挿入（調整レイヤー）
            await this.prisma.adjustment.create({
              data: {
                staffId: staff.id,
                date: new Date(schedule.date),
                status: schedule.status,
                start: startUtc,
                end: endUtc,
                memo: schedule.memo || null,
                reason: 'CSVインポート',
                batchId: batchId,
                updatedAt: new Date()
              }
            });
          }

          // 担当設定がある場合は DailyAssignment に保存
          if (schedule.assignmentType) {
            console.log(`Creating assignment: ${schedule.empNo} ${schedule.date} ${schedule.assignmentType}`);
            
            // 既存の担当設定を削除
            await this.prisma.dailyAssignment.deleteMany({
              where: {
                staffId: staff.id,
                date: new Date(schedule.date)
              }
            });
            
            // 新しい担当設定を作成
            await this.prisma.dailyAssignment.create({
              data: {
                staffId: staff.id,
                date: new Date(schedule.date),
                assignmentType: schedule.assignmentType,
                customLabel: schedule.customLabel || null,
                updatedAt: new Date()
              }
            });
          }

          results.imported++;
          results.details.push({
            empNo: schedule.empNo,
            status: schedule.status,
            time: schedule.time,
            assignmentType: schedule.assignmentType,
            action: '作成完了'
          });

        } catch (scheduleError) {
          console.error(`Error processing schedule for ${schedule.empNo}:`, scheduleError);
          console.error('Schedule data:', schedule);
          console.error('Stack trace:', scheduleError.stack);
          results.errors.push({
            empNo: schedule.empNo,
            error: scheduleError.message || 'Unknown error',
            details: schedule
          });
        }
      }

      console.log(`CSV Import completed: ${results.imported} imported, ${results.skipped} skipped`);
      return results;

    } catch (error) {
      console.error('CSV Import failed:', error);
      results.success = false;
      results.errors.push({ general: error.message });
      return results;
    }
  }

  private parseTimeRange(timeRange: string): { startTime: string; endTime: string } {
    // "14:00-16:00" → { startTime: "14:00", endTime: "16:00" }
    if (!timeRange) {
      throw new Error('Time range is required');
    }
    const [startTime, endTime] = timeRange.split('-').map(t => t.trim());
    if (!startTime || !endTime) {
      throw new Error(`Invalid time range format: ${timeRange}`);
    }
    return { startTime, endTime };
  }

  private parseTimeToUtc(timeString: string, dateString: string): Date {
    // "14:00" + "2025-06-23" → UTC Date
    const jstIsoString = `${dateString}T${timeString}:00+09:00`;
    return new Date(jstIsoString);
  }

  async getImportHistory() {
    const imports = await this.prisma.adjustment.groupBy({
      by: ['batchId'],
      where: {
        batchId: { not: null }
      },
      _count: { id: true },
      _min: { createdAt: true }
    });

    return imports.map(imp => ({
      batchId: imp.batchId,
      count: imp._count.id,
      createdAt: imp._min.createdAt
    }));
  }

  async rollbackImport(batchId: string) {
    console.log(`Rolling back import batch: ${batchId}`);
    
    const deleted = await this.prisma.adjustment.deleteMany({
      where: { batchId }
    });

    console.log(`Rollback completed: ${deleted.count} records deleted`);
    
    return {
      success: true,
      batchId,
      deletedCount: deleted.count
    };
  }
}