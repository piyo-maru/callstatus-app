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

// デフォルトのグローバルプリセット設定（フロントエンドのDEFAULT_UNIFIED_PRESETSと同期）
const DEFAULT_GLOBAL_PRESET_SETTINGS: Omit<GlobalPresetSettingsDto, 'version' | 'lastModified'> = {
  presets: [
    // 一般勤務カテゴリ
    {
      id: 'full-time-employee',
      name: 'full-time-employee',
      displayName: '正社員',
      description: '9:00-12:00 + 昼休み + 13:00-18:00の正社員勤務',
      category: 'general',
      schedules: [
        { status: 'online', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 12, endTime: 13, memo: '' },
        { status: 'online', startTime: 13, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'part-time-employee',
      name: 'part-time-employee',
      displayName: 'パートタイマー',
      description: '9:00-12:00 + 昼休み + 13:00-16:00のパートタイム勤務',
      category: 'general',
      schedules: [
        { status: 'online', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 12, endTime: 13, memo: '' },
        { status: 'online', startTime: 13, endTime: 16, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'remote-full-time',
      name: 'remote-full-time',
      displayName: '在宅勤務（正社員）',
      description: '9:00-12:00 + 昼休み + 13:00-18:00の在宅正社員勤務',
      category: 'general',
      schedules: [
        { status: 'remote', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 12, endTime: 13, memo: '' },
        { status: 'remote', startTime: 13, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'remote-part-time',
      name: 'remote-part-time',
      displayName: '在宅勤務（パートタイマー）',
      description: '9:00-12:00 + 昼休み + 13:00-16:00の在宅パートタイム勤務',
      category: 'general',
      schedules: [
        { status: 'remote', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 12, endTime: 13, memo: '' },
        { status: 'remote', startTime: 13, endTime: 16, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // 休暇カテゴリ
    {
      id: 'full-day-off',
      name: 'full-day-off',
      displayName: '終日休み',
      description: '一日中休暇',
      category: 'time-off',
      schedules: [
        { status: 'off', startTime: 9, endTime: 18, memo: '終日休暇' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: false,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'sudden-off',
      name: 'sudden-off',
      displayName: '突発休',
      description: '突発的な休暇',
      category: 'time-off',
      schedules: [
        { status: 'off', startTime: 9, endTime: 18, memo: '突発休' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: false,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'morning-off',
      name: 'morning-off',
      displayName: '午前休',
      description: '午前中休暇',
      category: 'time-off',
      schedules: [
        { status: 'off', startTime: 9, endTime: 13, memo: '午前休' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: false,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'afternoon-off',
      name: 'afternoon-off',
      displayName: '午後休',
      description: '午後休暇',
      category: 'time-off',
      schedules: [
        { status: 'off', startTime: 13, endTime: 18, memo: '午後休' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: false,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'lunch-break',
      name: 'lunch-break',
      displayName: '昼休み',
      description: '12:00-13:00の昼休憩',
      category: 'time-off',
      schedules: [
        { status: 'break', startTime: 12, endTime: 13, memo: '昼休憩' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: false,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // 夜間担当カテゴリ
    {
      id: 'night-duty',
      name: 'night-duty',
      displayName: '夜間担当',
      description: '18:00-21:00の夜間担当',
      category: 'night-duty',
      schedules: [
        { status: 'night duty', startTime: 18, endTime: 21, memo: '夜間担当' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'night-duty-extended',
      name: 'night-duty-extended',
      displayName: '夜間担当(延長)',
      description: '17:00-21:00の夜間担当(延長)',
      category: 'night-duty',
      schedules: [
        { status: 'night duty', startTime: 17, endTime: 21, memo: '夜間担当(延長)' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // その他カテゴリ
    {
      id: 'meeting-block',
      name: 'meeting-block',
      displayName: '会議ブロック',
      description: '14:00-15:00の会議時間',
      category: 'special',
      schedules: [
        { status: 'meeting', startTime: 14, endTime: 15, memo: '定例会議' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'training',
      name: 'training',
      displayName: '研修・トレーニング',
      description: '10:00-16:00の研修時間',
      category: 'special',
      schedules: [
        { status: 'training', startTime: 10, endTime: 16, memo: '研修・トレーニング' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: true,
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
      enabledPresetIds: [
        'full-time-employee',
        'part-time-employee',
        'remote-full-time',
        'remote-part-time',
        'full-day-off',
        'sudden-off',
        'morning-off',
        'afternoon-off',
        'night-duty'
      ],
      defaultPresetId: 'full-time-employee',
      presetDisplayOrder: [
        'full-time-employee',
        'part-time-employee', 
        'remote-full-time',
        'remote-part-time',
        'full-day-off',
        'sudden-off',
        'morning-off',
        'afternoon-off',
        'night-duty'
      ]
    },
    personalPage: {
      enabledPresetIds: [
        'full-time-employee',
        'part-time-employee',
        'remote-full-time',
        'remote-part-time',
        'meeting-block',
        'training',
        'full-day-off',
        'sudden-off',
        'morning-off',
        'afternoon-off',
        'lunch-break',
        'night-duty',
        'night-duty-extended'
      ],
      defaultPresetId: 'full-time-employee',
      presetDisplayOrder: [
        'full-time-employee',
        'part-time-employee',
        'remote-full-time',
        'remote-part-time',
        'meeting-block',
        'training',
        'full-day-off',
        'sudden-off',
        'morning-off',
        'afternoon-off',
        'lunch-break',
        'night-duty',
        'night-duty-extended'
      ]
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