import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SchedulesGateway } from './schedules.gateway';

// --- ★★★ ここからがダミーデータ生成ロジック ★★★ ---

// 日本語のダミー姓と名
const lastNames = ["佐藤", "鈴木", "高橋", "田中", "渡辺", "伊藤", "山本", "中村", "小林", "加藤", "吉田", "山田", "佐々木", "山口", "松本", "井上", "木村", "林", "斎藤", "清水", "山崎", "森", "阿部", "池田", "橋本", "石川", "小川", "前田", "藤田", "岡田"];
const firstNames = ["太郎", "花子", "一郎", "次郎", "三郎", "さくら", "健太", "陽子", "純", "明美", "直樹", "恵子", "浩", "美咲", "大輔", "優子", "誠", "由美", "拓也", "愛", "翼", "菜々", "翔太", "舞", "蓮", "杏", "颯太", "凛", "悠真", "結衣"];

// 部署とグループの構成
const orgStructure = [
    { department: "財務情報第一システムサポート課", groups: ["財務会計グループ", "ＦＸ２グループ", "ＦＸ２・ＦＸ４クラウドグループ", "業種別システムグループ"] },
    { department: "財務情報第二システムサポート課", groups: ["ＦＸクラウドグループ", "ＳＸ・ＦＭＳグループ"] },
    { department: "税務情報システムサポート課", groups: ["税務情報第一システムグループ", "税務情報第二システムグループ"] },
    { department: "給与計算システムサポート課", groups: ["ＰＸ第一グループ", "ＰＸ第二グループ", "ＰＸ第三グループ"] },
    { department: "ＯＭＳ・テクニカルサポート課", groups: ["ＯＭＳグループ", "ハードウェアグループ"] },
    { department: "一次受付サポート課", groups: ["一次受付グループ"] }
];

// スタッフデータを生成する関数
const generateStaffData = () => {
    const staffData = [];
    let staffCounter = 0;
    for (const org of orgStructure) {
        for (const group of org.groups) {
            const staffCountInGroup = Math.floor(Math.random() * 3) + 2; // 各グループに2〜4人
            for (let i = 0; i < staffCountInGroup; i++) {
                if (staffCounter >= lastNames.length) break;
                staffData.push({
                    name: `${lastNames[staffCounter]} ${firstNames[staffCounter]}`,
                    department: org.department,
                    group: group,
                });
                staffCounter++;
            }
        }
    }
    return staffData;
};

// スケジュールデータを生成する関数
const generateScheduleData = (staffList: { id: number }[]) => {
    const scheduleData = [];
    const eventStatuses = ['Meeting', 'Training'];

    for (const staff of staffList) {
        // 9割の確率で、基本的な勤務スケジュールを持つ
        if (Math.random() < 0.9) {
            scheduleData.push({ staffId: staff.id, status: 'Online', start: new Date(new Date().setUTCHours(9, 0, 0, 0)), end: new Date(new Date().setUTCHours(12, 0, 0, 0)) });
            scheduleData.push({ staffId: staff.id, status: 'Break', start: new Date(new Date().setUTCHours(12, 0, 0, 0)), end: new Date(new Date().setUTCHours(13, 0, 0, 0)) });
            scheduleData.push({ staffId: staff.id, status: 'Online', start: new Date(new Date().setUTCHours(13, 0, 0, 0)), end: new Date(new Date().setUTCHours(18, 0, 0, 0)) });
        } else {
            // 1割は終日休み
            scheduleData.push({ staffId: staff.id, status: 'Off', start: new Date(new Date().setUTCHours(9, 0, 0, 0)), end: new Date(new Date().setUTCHours(18, 0, 0, 0)) });
        }
        
        // 3分の1の確率でランダムなイベント（会議や研修）を追加
        if (Math.random() < 0.33) {
            const randomStatus = eventStatuses[Math.floor(Math.random() * eventStatuses.length)];
            const randomStart = Math.floor(Math.random() * 3) + 10; // 10, 11, 12
            scheduleData.push({
                staffId: staff.id,
                status: randomStatus,
                start: new Date(new Date().setUTCHours(randomStart, 0, 0, 0)),
                end: new Date(new Date().setUTCHours(randomStart + 1, 0, 0, 0)),
            });
        }
    }
    return scheduleData;
}

// --- ★★★ ここまでがダミーデータ生成ロジック ★★★ ---


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
      
      const dummyStaffData = generateStaffData();
      await this.prisma.staff.createMany({ data: dummyStaffData });

      // ★★★ 新機能: 作成したスタッフのスケジュールも投入 ★★★
      const allStaff = await this.prisma.staff.findMany({ select: { id: true } });
      const dummyScheduleData = generateScheduleData(allStaff);
      await this.prisma.schedule.createMany({ data: dummyScheduleData });
    }

    const staff = await this.prisma.staff.findMany();
    const schedules = await this.prisma.schedule.findMany();
    return { staff, schedules };
  }

  async create(createScheduleDto: { staffId: number; status: string; start: number; end: number }) {
    const startDate = new Date();
    startDate.setUTCHours(createScheduleDto.start, 0, 0, 0);

    const endDate = new Date();
    endDate.setUTCHours(createScheduleDto.end, 0, 0, 0);

    const newSchedule = await this.prisma.schedule.create({
      data: {
        staffId: createScheduleDto.staffId,
        status: createScheduleDto.status,
        start: startDate,
        end: endDate,
      },
    });

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
