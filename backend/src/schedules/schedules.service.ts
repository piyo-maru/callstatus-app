import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SchedulesGateway } from './schedules.gateway';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private readonly gateway: SchedulesGateway,
  ) {}

  // toDateヘルパーが、基準日を受け取れるように修正
  private toDate(decimalHour: number, baseDateString: string): Date {
    const baseDate = new Date(baseDateString);
    const hours = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour % 1) * 60);
    // JSのDateがタイムゾーンの影響を受けないように、UTCで日付を設定
    const date = new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0, 0));
    return date;
  };

  async findAll(dateString: string) {
    // 日付の始点と終点を計算
    const date = new Date(dateString);
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));

    const staffCount = await this.prisma.staff.count();
    if (staffCount === 0) {
        // (初期データ投入ロジックは変更なし)
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

  async create(createScheduleDto: { staffId: number; status: string; start: number; end: number; date: string; }) {
    const newSchedule = await this.prisma.schedule.create({
      data: {
        staffId: createScheduleDto.staffId,
        status: createScheduleDto.status,
        start: this.toDate(createScheduleDto.start, createScheduleDto.date),
        end: this.toDate(createScheduleDto.end, createScheduleDto.date),
      },
    });
    this.gateway.sendNewSchedule(newSchedule);
    return newSchedule;
  }

  async update(id: number, updateScheduleDto: { status?: string; start?: number; end?: number; date: string; }) {
    const data: { status?: string; start?: Date; end?: Date } = {};
    if (updateScheduleDto.status) data.status = updateScheduleDto.status;
    if (updateScheduleDto.start) data.start = this.toDate(updateScheduleDto.start, updateScheduleDto.date);
    if (updateScheduleDto.end) data.end = this.toDate(updateScheduleDto.end, updateScheduleDto.date);

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