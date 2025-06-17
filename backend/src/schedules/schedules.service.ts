import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SchedulesGateway } from './schedules.gateway';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SchedulesGateway))
    private readonly gateway: SchedulesGateway,
  ) {}

  // toDateヘルパーが、基準日を受け取れるように修正（JST基準）
  private toDate(decimalHour: number, baseDateString: string): Date {
    const baseDate = new Date(baseDateString);
    const hours = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour % 1) * 60);
    // JST時刻として作成し、UTCに変換してJST時刻として保存
    // 例: JST 14:00 → UTC 05:00として保存、フロントエンドでJST 14:00として表示
    const jstOffset = 9; // JST = UTC+9
    const utcHours = hours - jstOffset;
    const date = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), utcHours, minutes, 0, 0));
    return date;
  };

  async findAll(dateString: string) {
    // 日付の始点と終点を計算（JST基準）
    const date = new Date(dateString);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);

    const staffCount = await this.prisma.staff.count();
    if (staffCount === 0) {
      console.log('データベースに初期データを投入します...');
      const dummyStaffData = [
          { name: '佐藤 太郎', department: '財務情報第一システムサポート課', group: '財務会計グループ' },
          { name: '鈴木 花子', department: '財務情報第一システムサポート課', group: '財務会計グループ' },
          { name: '高橋 一郎', department: '財務情報第一システムサポート課', group: 'ＦＸ２グループ' },
          { name: '田中 次郎', department: '財務情報第二システムサポート課', group: 'ＦＸクラウドグループ' },
          { name: '渡辺 三郎', department: '財務情報第二システムサポート課', group: 'ＳＸ・ＦＭＳグループ' },
          { name: '伊藤 さくら', department: '税務情報システムサポート課', group: '税務情報第一システムグループ' },
          { name: '山本 健太', department: '税務情報システムサポート課', group: '税務情報第二システムグループ' },
      ];
      await this.prisma.staff.createMany({ data: dummyStaffData });
    }

    const staff = await this.prisma.staff.findMany();
    // ★★★ where句を追加して、指定された日付のスケジュールのみ取得 ★★★
    const schedules = await this.prisma.schedule.findMany({
      where: {
        start: {
          gte: startOfDay,
          lt: endOfDay,
        }
      }
    });
    return { staff, schedules };
  }

  async create(createScheduleDto: { staffId: number; status: string; start: number; end: number; date: string; memo?: string; }) {
    const newSchedule = await this.prisma.schedule.create({
      data: {
        staffId: createScheduleDto.staffId,
        status: createScheduleDto.status,
        start: this.toDate(createScheduleDto.start, createScheduleDto.date),
        end: this.toDate(createScheduleDto.end, createScheduleDto.date),
        memo: createScheduleDto.memo || null,
      },
    });
    this.gateway.sendNewSchedule(newSchedule);
    return newSchedule;
  }

  async update(id: number, updateScheduleDto: { status?: string; start?: number; end?: number; date: string; memo?: string; }) {
    const data: { status?: string; start?: Date; end?: Date; memo?: string | null } = {};
    if (updateScheduleDto.status) data.status = updateScheduleDto.status;
    if (updateScheduleDto.start) data.start = this.toDate(updateScheduleDto.start, updateScheduleDto.date);
    if (updateScheduleDto.end) data.end = this.toDate(updateScheduleDto.end, updateScheduleDto.date);
    if (updateScheduleDto.memo !== undefined) data.memo = updateScheduleDto.memo || null;

    const updatedSchedule = await this.prisma.schedule.update({
      where: { id },
      data,
    });
    this.gateway.sendScheduleUpdated(updatedSchedule);
    return updatedSchedule;
  }

  async remove(id: number) {
    const deletedSchedule = await this.prisma.schedule.delete({
      where: { id },
    });
    this.gateway.sendScheduleDeleted(id);
    return deletedSchedule;
  }
}