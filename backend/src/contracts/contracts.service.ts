import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TimeUtils } from '../utils/time-utils';

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
    // 指定月の全日数を取得（UTC基準）
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
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
        // UTC基準での曜日判定（重要な修正）
        const dayOfWeek = TimeUtils.getUTCDayOfWeek(year, month, day);
        
        // 曜日に対応する勤務時間を取得
        const dayColumn = TimeUtils.getContractDayColumn(dayOfWeek);
        const workingHours = contract[dayColumn] as string | null;
        
        // 勤務時間が設定されている場合のみデータに追加
        if (workingHours) {
          // UTC基準での日付文字列生成
          const dateString = TimeUtils.createUTCDateString(year, month, day);
          
          scheduleData.push({
            staffId: contract.Staff.id,
            staffName: contract.Staff.name,
            department: contract.Staff.department,
            group: contract.Staff.group,
            date: TimeUtils.formatDateOnly(dateString), // YYYY-MM-DD形式
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

  /**
   * 指定スタッフの契約データを取得
   * @param staffId スタッフID
   * @returns 契約データ
   */
  async getStaffContract(staffId: number) {
    const contract = await this.prisma.contract.findFirst({
      where: { staffId: staffId },
    });
    
    return contract;
  }
}