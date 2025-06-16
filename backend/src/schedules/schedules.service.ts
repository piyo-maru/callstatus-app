import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SchedulesGateway } from './schedules.gateway';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private readonly gateway: SchedulesGateway,
  ) {}

  async findAll() {
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
    const schedules = await this.prisma.schedule.findMany();
    return { staff, schedules };
  }

  async create(createScheduleDto: { staffId: number; status: string; start: number; end: number }) {
    // ★★★ ここからが修正点 ★★★
    // 小数で来る時間（例: 9.25）を、日付オブジェクトに正しく変換する関数
    const toDate = (decimalHour: number): Date => {
        const date = new Date(); // 今日の日付を基準にする
        const hours = Math.floor(decimalHour);
        const minutes = Math.round((decimalHour % 1) * 60);
        // UTC基準で時刻を設定
        date.setUTCHours(hours, minutes, 0, 0);
        return date;
    };

    const newSchedule = await this.prisma.schedule.create({
      data: {
        staffId: createScheduleDto.staffId,
        status: createScheduleDto.status,
        start: toDate(createScheduleDto.start),
        end: toDate(createScheduleDto.end),
      },
    });
    // ★★★ ここまでが修正点 ★★★

    this.gateway.sendNewSchedule(newSchedule);
    return newSchedule;
  }

  async remove(id: number) {
    const deletedSchedule = await this.prisma.schedule.delete({
      where: { id },
    });
    this.gateway.sendScheduleDeleted(id);
    return deletedSchedule;
  }
}
