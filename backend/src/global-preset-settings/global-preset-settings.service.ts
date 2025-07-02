import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GlobalPresetSettings } from '@prisma/client';

// グローバルプリセット設定のDTO（フロントエンドのUserPresetSettingsと互換）
export interface GlobalPresetSettingsDto {
  presets: Array<{
    id: string;
    name: string;
    displayName: string;
    description?: string;
    category: 'general' | 'time-off' | 'special' | 'night-duty';
    schedules: Array<{
      status: string;
      startTime: number;
      endTime: number;
      memo?: string;
    }>;
    representativeScheduleIndex?: number;
    isActive: boolean;
    customizable: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  categories: Array<{
    id: string;
    label: string;
    description: string;
    color: string;
    displayOrder: number;
  }>;
  pagePresetSettings: {
    monthlyPlanner: {
      enabledPresetIds: string[];
      defaultPresetId?: string;
      presetDisplayOrder?: string[];
    };
    personalPage: {
      enabledPresetIds: string[];
      defaultPresetId?: string;
      presetDisplayOrder?: string[];
    };
  };
  version: string;
  lastModified: string;
}

// デフォルトのグローバルプリセット設定
const DEFAULT_GLOBAL_PRESET_SETTINGS: Omit<GlobalPresetSettingsDto, 'version' | 'lastModified'> = {
  presets: [
    {
      id: 'standard-work',
      name: 'standardWork',
      displayName: '通常勤務',
      description: '標準的な勤務時間のプリセット',
      category: 'general',
      schedules: [
        { status: '出社', startTime: 9, endTime: 18, memo: '通常勤務' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: false,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'early-shift',
      name: 'earlyShift',
      displayName: '早番',
      description: '早番勤務のプリセット',
      category: 'general',
      schedules: [
        { status: '出社', startTime: 8, endTime: 17, memo: '早番' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'late-shift',
      name: 'lateShift',
      displayName: '遅番',
      description: '遅番勤務のプリセット',
      category: 'general',
      schedules: [
        { status: '出社', startTime: 10, endTime: 19, memo: '遅番' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'paid-leave',
      name: 'paidLeave',
      displayName: '有給休暇',
      description: '有給休暇のプリセット',
      category: 'time-off',
      schedules: [
        { status: '有給', startTime: 0, endTime: 24, memo: '有給休暇' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: false,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'night-duty',
      name: 'nightDuty',
      displayName: '夜間担当',
      description: '夜間担当のプリセット',
      category: 'night-duty',
      schedules: [
        { status: '夜間担当', startTime: 17, endTime: 21, memo: '夜間担当' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  categories: [
    { id: 'general', label: '一般勤務', description: '通常の勤務パターン', color: '#3B82F6', displayOrder: 0 },
    { id: 'time-off', label: '休暇', description: '休暇・休業関連', color: '#EF4444', displayOrder: 1 },
    { id: 'special', label: '特別勤務', description: '特別な勤務形態', color: '#8B5CF6', displayOrder: 2 },
    { id: 'night-duty', label: '夜間担当', description: '夜間担当・支援業務', color: '#F59E0B', displayOrder: 3 }
  ],
  pagePresetSettings: {
    monthlyPlanner: {
      enabledPresetIds: ['standard-work', 'early-shift', 'late-shift', 'paid-leave', 'night-duty'],
      defaultPresetId: 'standard-work',
      presetDisplayOrder: ['standard-work', 'early-shift', 'late-shift', 'paid-leave', 'night-duty']
    },
    personalPage: {
      enabledPresetIds: ['standard-work', 'early-shift', 'late-shift', 'paid-leave', 'night-duty'],
      defaultPresetId: 'standard-work',
      presetDisplayOrder: ['standard-work', 'early-shift', 'late-shift', 'paid-leave', 'night-duty']
    }
  }
};

@Injectable()
export class GlobalPresetSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * グローバルプリセット設定を取得
   * レコードが存在しない場合はデフォルト設定で初期化
   */
  async getSettings(): Promise<GlobalPresetSettingsDto> {
    let settings = await this.prisma.globalPresetSettings.findFirst({
      where: { id: 1 }
    });

    // 設定が存在しない場合はデフォルト設定で初期化
    if (!settings) {
      settings = await this.initializeDefaultSettings();
    }

    return {
      presets: Array.isArray(settings.presets) ? settings.presets as any[] : [],
      categories: Array.isArray(settings.categories) ? settings.categories as any[] : [],
      pagePresetSettings: (settings.pagePresetSettings as any) || DEFAULT_GLOBAL_PRESET_SETTINGS.pagePresetSettings,
      version: settings.version,
      lastModified: settings.updatedAt.toISOString(),
    };
  }

  /**
   * グローバルプリセット設定を更新
   */
  async updateSettings(
    updateData: Partial<GlobalPresetSettingsDto>,
    updatedByStaffId?: number
  ): Promise<GlobalPresetSettingsDto> {
    // まず現在の設定を取得（存在しない場合は初期化）
    await this.getSettings();

    // バージョンを自動インクリメント
    const currentVersion = await this.getCurrentVersion();
    const newVersion = this.incrementVersion(currentVersion);

    const settings = await this.prisma.globalPresetSettings.upsert({
      where: { id: 1 },
      update: {
        ...(updateData.presets !== undefined && { presets: updateData.presets }),
        ...(updateData.categories !== undefined && { categories: updateData.categories }),
        ...(updateData.pagePresetSettings !== undefined && { pagePresetSettings: updateData.pagePresetSettings }),
        version: newVersion,
        updatedBy: updatedByStaffId || null,
      },
      create: {
        id: 1,
        presets: updateData.presets || DEFAULT_GLOBAL_PRESET_SETTINGS.presets,
        categories: updateData.categories || DEFAULT_GLOBAL_PRESET_SETTINGS.categories,
        pagePresetSettings: updateData.pagePresetSettings || DEFAULT_GLOBAL_PRESET_SETTINGS.pagePresetSettings,
        version: newVersion,
        updatedBy: updatedByStaffId || null,
      },
    });

    return {
      presets: Array.isArray(settings.presets) ? settings.presets as any[] : [],
      categories: Array.isArray(settings.categories) ? settings.categories as any[] : [],
      pagePresetSettings: (settings.pagePresetSettings as any) || DEFAULT_GLOBAL_PRESET_SETTINGS.pagePresetSettings,
      version: settings.version,
      lastModified: settings.updatedAt.toISOString(),
    };
  }

  /**
   * バージョン情報のみを取得（キャッシュ同期用）
   */
  async getVersion(): Promise<{ version: string; lastModified: string }> {
    const settings = await this.prisma.globalPresetSettings.findFirst({
      where: { id: 1 },
      select: { version: true, updatedAt: true }
    });

    if (!settings) {
      // 設定が存在しない場合は初期化
      const initialized = await this.initializeDefaultSettings();
      return {
        version: initialized.version,
        lastModified: initialized.updatedAt.toISOString()
      };
    }

    return {
      version: settings.version,
      lastModified: settings.updatedAt.toISOString()
    };
  }

  /**
   * デフォルト設定で初期化
   */
  private async initializeDefaultSettings(): Promise<GlobalPresetSettings> {
    return this.prisma.globalPresetSettings.create({
      data: {
        id: 1,
        presets: DEFAULT_GLOBAL_PRESET_SETTINGS.presets,
        categories: DEFAULT_GLOBAL_PRESET_SETTINGS.categories,
        pagePresetSettings: DEFAULT_GLOBAL_PRESET_SETTINGS.pagePresetSettings,
        version: '1.0.0',
      },
    });
  }

  /**
   * 現在のバージョンを取得
   */
  private async getCurrentVersion(): Promise<string> {
    const settings = await this.prisma.globalPresetSettings.findFirst({
      where: { id: 1 },
      select: { version: true }
    });
    return settings?.version || '1.0.0';
  }

  /**
   * バージョンをインクリメント（セマンティックバージョニング）
   */
  private incrementVersion(currentVersion: string): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    // パッチバージョンをインクリメント
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * 設定の履歴・監査情報を取得
   */
  async getSettingsHistory(): Promise<{
    settings: GlobalPresetSettingsDto;
    lastUpdatedAt: Date | null;
    lastUpdatedBy: { id: number; name: string } | null;
  }> {
    const settings = await this.prisma.globalPresetSettings.findFirst({
      where: { id: 1 },
      include: {
        UpdatedByStaff: {
          select: { id: true, name: true }
        }
      }
    });

    if (!settings) {
      const defaultSettings = await this.initializeDefaultSettings();
      return {
        settings: {
          presets: DEFAULT_GLOBAL_PRESET_SETTINGS.presets,
          categories: DEFAULT_GLOBAL_PRESET_SETTINGS.categories,
          pagePresetSettings: DEFAULT_GLOBAL_PRESET_SETTINGS.pagePresetSettings,
          version: defaultSettings.version,
          lastModified: defaultSettings.updatedAt.toISOString(),
        },
        lastUpdatedAt: null,
        lastUpdatedBy: null,
      };
    }

    return {
      settings: {
        presets: Array.isArray(settings.presets) ? settings.presets as any[] : [],
        categories: Array.isArray(settings.categories) ? settings.categories as any[] : [],
        pagePresetSettings: (settings.pagePresetSettings as any) || DEFAULT_GLOBAL_PRESET_SETTINGS.pagePresetSettings,
        version: settings.version,
        lastModified: settings.updatedAt.toISOString(),
      },
      lastUpdatedAt: settings.updatedAt,
      lastUpdatedBy: settings.UpdatedByStaff,
    };
  }
}