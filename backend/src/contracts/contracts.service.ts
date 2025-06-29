import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 指定月の契約スケジュール情報を取得
   * @param year 年
   * @param month 月（1-12）
   * @returns 各スタッフ・各日の契約勤務時間有無情報
   */
  async getMonthlyContractSchedules(year: number, month: number) {
    // 指定月の全日数を取得
    const daysInMonth = new Date(year, month, 0).getDate();
    const dateArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // 全契約データを取得（staffとの結合）
    const contracts = await this.prisma.contract.findMany({
      include: {
        Staff: {
          select: {
            id: true,
            name: true,
            department: true,
            group: true,
            isActive: true,
          },
        },
      },
      where: {
        Staff: {
          isActive: true,
        },
      },
    });

    // 各日と各スタッフの組み合わせで契約勤務時間があるかチェック
    const scheduleData = [];
    
    for (const contract of contracts) {
      for (const day of dateArray) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay(); // 0: 日曜日, 1: 月曜日, ..., 6: 土曜日
        
        // 曜日に対応する勤務時間を取得
        let workingHours: string | null = null;
        switch (dayOfWeek) {
          case 0: // 日曜日
            workingHours = contract.sundayHours;
            break;
          case 1: // 月曜日
            workingHours = contract.mondayHours;
            break;
          case 2: // 火曜日
            workingHours = contract.tuesdayHours;
            break;
          case 3: // 水曜日
            workingHours = contract.wednesdayHours;
            break;
          case 4: // 木曜日
            workingHours = contract.thursdayHours;
            break;
          case 5: // 金曜日
            workingHours = contract.fridayHours;
            break;
          case 6: // 土曜日
            workingHours = contract.saturdayHours;
            break;
        }
        
        // 勤務時間が設定されている場合のみデータに追加
        if (workingHours) {
          scheduleData.push({
            staffId: contract.Staff.id,
            staffName: contract.Staff.name,
            department: contract.Staff.department,
            group: contract.Staff.group,
            date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            day: day,
            dayOfWeek: dayOfWeek,
            workingHours: workingHours,
          });
        }
      }
    }

    return {
      year,
      month,
      schedules: scheduleData,
    };
  }
}