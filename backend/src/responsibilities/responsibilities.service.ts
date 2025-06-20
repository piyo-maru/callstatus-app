import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateResponsibilityDto {
  staffId: number;
  date: string; // YYYY-MM-DD
  responsibilities: ResponsibilityData;
}

export interface UpdateResponsibilityDto {
  responsibilities: ResponsibilityData;
}

// 一般部署用
export interface GeneralResponsibilityData {
  fax: boolean;
  subjectCheck: boolean;
  custom: string;
}

// 受付部署用  
export interface ReceptionResponsibilityData {
  lunch: boolean;
  fax: boolean;
  cs: boolean;
  custom: string;
}

export type ResponsibilityData = GeneralResponsibilityData | ReceptionResponsibilityData;

@Injectable()
export class ResponsibilitiesService {
  constructor(private prisma: PrismaService) {}

  /**
   * 指定日のスタッフ担当設定を取得
   */
  async findByStaffIdAndDate(staffId: number, date: string) {
    return this.prisma.staffResponsibility.findUnique({
      where: { 
        staffId_date: { 
          staffId, 
          date: new Date(date) 
        } 
      },
      include: {
        staff: {
          select: { id: true, name: true, department: true, group: true }
        }
      }
    });
  }

  /**
   * 指定日の全スタッフ担当設定を取得
   */
  async findByDate(date: string) {
    return this.prisma.staffResponsibility.findMany({
      where: { date: new Date(date) },
      include: {
        staff: {
          select: { id: true, name: true, department: true, group: true }
        }
      }
    });
  }

  /**
   * 担当設定を作成または更新
   */
  async upsert(createDto: CreateResponsibilityDto) {
    const date = new Date(createDto.date);

    return this.prisma.staffResponsibility.upsert({
      where: {
        staffId_date: {
          staffId: createDto.staffId,
          date
        }
      },
      update: {
        responsibilities: createDto.responsibilities as any
      },
      create: {
        staffId: createDto.staffId,
        date,
        responsibilities: createDto.responsibilities as any
      },
      include: {
        staff: {
          select: { id: true, name: true, department: true, group: true }
        }
      }
    });
  }

  /**
   * 担当設定を削除（空の状態で保存）
   */
  async clear(staffId: number, date: string) {
    const dateObj = new Date(date);
    
    // スタッフの部署情報を取得
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { department: true, group: true }
    });

    if (!staff) {
      throw new Error('スタッフが見つかりません');
    }

    // 受付部署かどうか判定
    const isReception = staff.department.includes('受付') || staff.group.includes('受付');
    
    // 空の担当設定
    const emptyResponsibilities = isReception 
      ? { lunch: false, fax: false, cs: false, custom: '' }
      : { fax: false, subjectCheck: false, custom: '' };

    return this.prisma.staffResponsibility.upsert({
      where: {
        staffId_date: {
          staffId,
          date: dateObj
        }
      },
      update: {
        responsibilities: emptyResponsibilities as any
      },
      create: {
        staffId,
        date: dateObj,
        responsibilities: emptyResponsibilities as any
      },
      include: {
        staff: {
          select: { id: true, name: true, department: true, group: true }
        }
      }
    });
  }

  /**
   * 全スタッフの指定日担当状況を取得
   */
  async getAllStaffResponsibilities(date: string = new Date().toISOString().split('T')[0]) {
    const allStaff = await this.prisma.staff.findMany({
      include: {
        responsibilities: {
          where: {
            date: new Date(date)
          }
        }
      }
    });

    return allStaff.map(staff => {
      const todayResponsibility = staff.responsibilities[0];
      const isReception = staff.department.includes('受付') || staff.group.includes('受付');
      
      return {
        id: staff.id,
        name: staff.name,
        department: staff.department,
        group: staff.group,
        isReception,
        responsibilities: todayResponsibility?.responsibilities || null,
        hasResponsibilities: !!todayResponsibility && this.hasActiveResponsibilities(todayResponsibility.responsibilities, isReception)
      };
    });
  }

  /**
   * アクティブな担当があるかチェック
   */
  private hasActiveResponsibilities(responsibilities: any, isReception: boolean): boolean {
    if (!responsibilities) return false;
    
    if (isReception) {
      const r = responsibilities as ReceptionResponsibilityData;
      return r.lunch || r.fax || r.cs || (r.custom && r.custom.trim() !== '');
    } else {
      const r = responsibilities as GeneralResponsibilityData;
      return r.fax || r.subjectCheck || (r.custom && r.custom.trim() !== '');
    }
  }
}