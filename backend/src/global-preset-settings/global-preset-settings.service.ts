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
  // 表示設定（組織統一）
  displaySettings: {
    customStatusColors: Record<string, string>;
    customStatusDisplayNames: Record<string, string>;
    hideEmptyDepartments: boolean;
    compactMode: boolean;
    showTimeLabels: boolean;
    highlightCurrentTime: boolean;
    use24HourFormat: boolean;
  };
  // 部署・グループ設定（組織統一）
  departmentSettings: Array<{
    id: string;
    name: string;
    description?: string;
    color: string;
    displayOrder: number;
    isActive: boolean;
    groups?: Array<{
      id: string;
      name: string;
      departmentId: string;
      color?: string;
      displayOrder: number;
      isActive: boolean;
    }>;
  }>;
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
  },
  // 表示設定のデフォルト値
  displaySettings: {
    customStatusColors: {},
    customStatusDisplayNames: {},
    hideEmptyDepartments: false,
    compactMode: false,
    showTimeLabels: true,
    highlightCurrentTime: true,
    use24HourFormat: true
  },
  // 部署・グループ設定のデフォルト値
  departmentSettings: [
    {
      id: 'general',
      name: '一般',
      description: '一般スタッフ',
      color: '#3B82F6',
      displayOrder: 0,
      isActive: true,
      groups: [
        {
          id: 'group-a',
          name: 'グループA',
          departmentId: 'general',
          color: '#3B82F6',
          displayOrder: 0,
          isActive: true
        },
        {
          id: 'group-b',
          name: 'グループB',
          departmentId: 'general',
          color: '#10B981',
          displayOrder: 1,
          isActive: true
        }
      ]
    },
    {
      id: 'management',
      name: '管理職',
      description: '管理職・責任者',
      color: '#8B5CF6',
      displayOrder: 1,
      isActive: true,
      groups: []
    }
  ]
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
      displaySettings: (settings.displaySettings as any) || DEFAULT_GLOBAL_PRESET_SETTINGS.displaySettings,
      departmentSettings: Array.isArray(settings.departmentSettings) ? settings.departmentSettings as any[] : DEFAULT_GLOBAL_PRESET_SETTINGS.departmentSettings,
      version: settings.version,
      lastModified: settings.updatedAt.toISOString(),
    };
  }

  /**
   * グローバルプリセット設定を更新（楽観的ロック対応）
   */
  async updateSettings(
    updateData: Partial<GlobalPresetSettingsDto>,
    expectedVersion?: string,
    updatedByStaffId?: number
  ): Promise<{ success: boolean; settings?: GlobalPresetSettingsDto; error?: string; conflictData?: GlobalPresetSettingsDto }> {
    return this.prisma.$transaction(async (prisma) => {
      // 1. 現在の設定を取得
      let currentSettings = await prisma.globalPresetSettings.findFirst({
        where: { id: 1 }
      });

      // 設定が存在しない場合は初期化
      if (!currentSettings) {
        currentSettings = await prisma.globalPresetSettings.create({
          data: {
            id: 1,
            presets: DEFAULT_GLOBAL_PRESET_SETTINGS.presets,
            categories: DEFAULT_GLOBAL_PRESET_SETTINGS.categories,
            pagePresetSettings: DEFAULT_GLOBAL_PRESET_SETTINGS.pagePresetSettings,
            displaySettings: DEFAULT_GLOBAL_PRESET_SETTINGS.displaySettings,
            departmentSettings: DEFAULT_GLOBAL_PRESET_SETTINGS.departmentSettings,
            version: '1.0.0',
          },
        });
      }

      // 2. バージョン競合チェック（楽観的ロック）
      if (expectedVersion && currentSettings.version !== expectedVersion) {
        const conflictData: GlobalPresetSettingsDto = {
          presets: Array.isArray(currentSettings.presets) ? currentSettings.presets as any[] : [],
          categories: Array.isArray(currentSettings.categories) ? currentSettings.categories as any[] : [],
          pagePresetSettings: (currentSettings.pagePresetSettings as any) || DEFAULT_GLOBAL_PRESET_SETTINGS.pagePresetSettings,
          displaySettings: (currentSettings.displaySettings as any) || DEFAULT_GLOBAL_PRESET_SETTINGS.displaySettings,
          departmentSettings: Array.isArray(currentSettings.departmentSettings) ? currentSettings.departmentSettings as any[] : DEFAULT_GLOBAL_PRESET_SETTINGS.departmentSettings,
          version: currentSettings.version,
          lastModified: currentSettings.updatedAt.toISOString(),
        };

        return {
          success: false,
          error: 'VERSION_CONFLICT',
          conflictData
        };
      }

      // 3. バージョンをインクリメントして更新
      const newVersion = this.incrementVersion(currentSettings.version);
      
      const updatedSettings = await prisma.globalPresetSettings.update({
        where: { id: 1 },
        data: {
          ...(updateData.presets !== undefined && { presets: updateData.presets }),
          ...(updateData.categories !== undefined && { categories: updateData.categories }),
          ...(updateData.pagePresetSettings !== undefined && { pagePresetSettings: updateData.pagePresetSettings }),
          ...(updateData.displaySettings !== undefined && { displaySettings: updateData.displaySettings }),
          ...(updateData.departmentSettings !== undefined && { departmentSettings: updateData.departmentSettings }),
          version: newVersion,
          updatedBy: updatedByStaffId || null,
        },
      });

      const settings: GlobalPresetSettingsDto = {
        presets: Array.isArray(updatedSettings.presets) ? updatedSettings.presets as any[] : [],
        categories: Array.isArray(updatedSettings.categories) ? updatedSettings.categories as any[] : [],
        pagePresetSettings: (updatedSettings.pagePresetSettings as any) || DEFAULT_GLOBAL_PRESET_SETTINGS.pagePresetSettings,
        displaySettings: (updatedSettings.displaySettings as any) || DEFAULT_GLOBAL_PRESET_SETTINGS.displaySettings,
        departmentSettings: Array.isArray(updatedSettings.departmentSettings) ? updatedSettings.departmentSettings as any[] : DEFAULT_GLOBAL_PRESET_SETTINGS.departmentSettings,
        version: updatedSettings.version,
        lastModified: updatedSettings.updatedAt.toISOString(),
      };

      return {
        success: true,
        settings
      };
    });
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
        displaySettings: DEFAULT_GLOBAL_PRESET_SETTINGS.displaySettings,
        departmentSettings: DEFAULT_GLOBAL_PRESET_SETTINGS.departmentSettings,
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
          displaySettings: DEFAULT_GLOBAL_PRESET_SETTINGS.displaySettings,
          departmentSettings: DEFAULT_GLOBAL_PRESET_SETTINGS.departmentSettings,
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
        displaySettings: (settings.displaySettings as any) || DEFAULT_GLOBAL_PRESET_SETTINGS.displaySettings,
        departmentSettings: Array.isArray(settings.departmentSettings) ? settings.departmentSettings as any[] : DEFAULT_GLOBAL_PRESET_SETTINGS.departmentSettings,
        version: settings.version,
        lastModified: settings.updatedAt.toISOString(),
      },
      lastUpdatedAt: settings.updatedAt,
      lastUpdatedBy: settings.UpdatedByStaff,
    };
  }
}