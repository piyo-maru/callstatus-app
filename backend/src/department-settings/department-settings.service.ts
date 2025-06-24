import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DepartmentSettingsService {
  constructor(private prisma: PrismaService) {}

  async getAllSettings() {
    // 現在在籍中の社員が使用している部署・グループを取得
    const activeStaff = await this.prisma.staff.findMany({
      where: { isActive: true },
      select: { department: true, group: true }
    });

    const activeContracts = await this.prisma.contract.findMany({
      include: { staff: true }
    });

    const activeContractsFiltered = activeContracts.filter(c => c.staff?.isActive === true);

    // 現在使用中の部署・グループ名を取得
    const activeDepartments = new Set([
      ...activeStaff.map(s => s.department),
      ...activeContractsFiltered.map(c => c.dept)
    ].filter(Boolean));

    const activeGroups = new Set([
      ...activeStaff.map(s => s.group),
      ...activeContractsFiltered.map(c => c.team)
    ].filter(Boolean));

    // 現在使用中の部署・グループの設定のみを取得
    const settings = await this.prisma.departmentSettings.findMany({
      where: {
        OR: [
          { type: 'department', name: { in: Array.from(activeDepartments) } },
          { type: 'group', name: { in: Array.from(activeGroups) } }
        ]
      },
      orderBy: [
        { type: 'asc' },
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    
    return {
      departments: settings.filter(s => s.type === 'department'),
      groups: settings.filter(s => s.type === 'group')
    };
  }

  async autoGenerateFromStaff() {
    // 現在在籍中のスタッフデータのみから部署・グループを抽出
    const staff = await this.prisma.staff.findMany({
      where: {
        isActive: true  // 在籍中の社員のみ
      },
      select: {
        department: true,
        group: true
      }
    });

    // 現在有効な契約からも部署・グループを取得
    const contracts = await this.prisma.contract.findMany({
      include: {
        staff: true
      }
    });

    // 在籍中の社員の契約のみをフィルタリング
    const activeContracts = contracts.filter(c => c.staff?.isActive === true);

    // 全ての部署・グループを統合してユニークにする
    const allDepartments = [
      ...staff.map(s => s.department),
      ...activeContracts.map(c => c.dept)
    ].filter(Boolean); // null/undefinedを除外

    const allGroups = [
      ...staff.map(s => s.group),
      ...activeContracts.map(c => c.team)
    ].filter(Boolean); // null/undefinedを除外

    // ユニークな部署・グループを抽出
    const departments = [...new Set(allDepartments)];
    const groups = [...new Set(allGroups)];

    // 既存設定を取得
    const existingSettings = await this.prisma.departmentSettings.findMany();
    const existingMap = new Map(
      existingSettings.map(s => [`${s.type}:${s.name}`, s])
    );

    const newSettings = [];

    // 部署の処理
    for (const dept of departments) {
      const key = `department:${dept}`;
      if (!existingMap.has(key)) {
        newSettings.push({
          type: 'department',
          name: dept,
          shortName: this.generateShortName(dept),
          backgroundColor: this.generateColor(dept)
        });
      }
    }

    // グループの処理
    for (const group of groups) {
      const key = `group:${group}`;
      if (!existingMap.has(key)) {
        newSettings.push({
          type: 'group',
          name: group,
          shortName: this.generateShortName(group),
          backgroundColor: this.generateColor(group)
        });
      }
    }

    // 新しい設定を一括作成
    if (newSettings.length > 0) {
      await this.prisma.departmentSettings.createMany({
        data: newSettings
      });
    }

    return {
      generated: newSettings.length,
      newSettings: newSettings
    };
  }

  async updateSettings(settings: Array<{
    type: 'department' | 'group';
    name: string;
    shortName?: string;
    backgroundColor?: string;
    displayOrder?: number;
  }>) {
    const results = [];

    for (const setting of settings) {
      const result = await this.prisma.departmentSettings.upsert({
        where: {
          type_name: {
            type: setting.type,
            name: setting.name
          }
        },
        update: {
          shortName: setting.shortName || null,
          backgroundColor: setting.backgroundColor || null,
          displayOrder: setting.displayOrder || 0,
          updatedAt: new Date()
        },
        create: {
          type: setting.type,
          name: setting.name,
          shortName: setting.shortName || null,
          backgroundColor: setting.backgroundColor || null,
          displayOrder: setting.displayOrder || 0
        }
      });
      results.push(result);
    }

    return { updated: results.length, settings: results };
  }

  async getSettingByName(type: 'department' | 'group', name: string) {
    return this.prisma.departmentSettings.findUnique({
      where: {
        type_name: {
          type,
          name
        }
      }
    });
  }

  // 短縮名の自動生成
  private generateShortName(name: string): string {
    return name
      .replace(/システムサポート課$/, 'システム')
      .replace(/グループ$/, 'G')
      .replace(/財務情報第一/, '財務一')
      .replace(/財務情報第二/, '財務二')
      .replace(/ＯＭＳ・テクニカルサポート課/, 'ＯＭＳ')
      .replace(/一次受付サポート課/, '一次受付')
      .replace(/税務情報システムサポート課/, '税務システム')
      .replace(/給与計算システムサポート課/, '給与システム')
      .substring(0, 8); // 最大8文字
  }

  // 背景色の自動生成（ハッシュベース）
  private generateColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash; // 32bit integerに変換
    }
    
    // パステルカラーの生成
    const hue = Math.abs(hash) % 360;
    const saturation = 25 + (Math.abs(hash) % 15); // 25-40%
    const lightness = 85 + (Math.abs(hash) % 10); // 85-95%
    
    return this.hslToHex(hue, saturation, lightness);
  }

  // HSLからHEXへの変換
  private hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
}