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

// デフォルトのグローバルプリセット設定（整理済み設定）
const DEFAULT_GLOBAL_PRESET_SETTINGS: Omit<GlobalPresetSettingsDto, 'version' | 'lastModified'> = {
  presets: [
    // 一般勤務カテゴリ
    {
      id: 'early-shift',
      name: 'earlyShift',
      displayName: '通常勤務（出向社員）',
      description: '9:00-18:00の標準的な勤務時間',
      category: 'general',
      schedules: [
        { status: '出社', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 12, endTime: 13, memo: '' },
        { status: 'online', startTime: 13, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751466294233',
      name: 'earlyShift-copy',
      displayName: '通常勤務（パートタイマー）',
      description: '9:00-17:45のパートタイム勤務',
      category: 'general',
      schedules: [
        { status: '出社', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 12, endTime: 13, memo: '' },
        { status: 'online', startTime: 13, endTime: 17.75, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751466304586',
      name: 'full-time-employee-copy-copy',
      displayName: '在宅勤務（出向社員）',
      description: '9:00-18:00の在宅勤務',
      category: 'general',
      schedules: [
        { status: 'remote', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 12, endTime: 13, memo: '' },
        { status: 'remote', startTime: 13, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751466316908',
      name: 'part-time-employee-copy-copy',
      displayName: '在宅勤務（パートタイマー）',
      description: '9:00-17:45の在宅勤務',
      category: 'general',
      schedules: [
        { status: 'remote', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 12, endTime: 13, memo: '' },
        { status: 'remote', startTime: 13, endTime: 17.75, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751466327183',
      name: 'standardWork-copy-copy',
      displayName: '振出（出向社員）',
      description: '振替出勤の勤務',
      category: 'general',
      schedules: [
        { status: '出社', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 12, endTime: 13, memo: '' },
        { status: 'online', startTime: 13, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751466335072',
      name: 'earlyShift-copy-copy',
      displayName: '振出（パートタイマー）',
      description: '振替出勤のパートタイム勤務',
      category: 'general',
      schedules: [
        { status: '出社', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 12, endTime: 13, memo: '' },
        { status: 'online', startTime: 13, endTime: 17.75, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // 休暇カテゴリ
    {
      id: 'paid-leave',
      name: 'paidLeave',
      displayName: '休暇',
      description: '有給休暇・年次休暇',
      category: 'time-off',
      schedules: [
        { status: 'off', startTime: 9, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751459171314',
      name: 'paidLeave-copy',
      displayName: '午前休',
      description: '午前中の半日休暇',
      category: 'time-off',
      schedules: [
        { status: 'off', startTime: 9, endTime: 14, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751459196532',
      name: 'paidLeave-copy-copy',
      displayName: '午後休',
      description: '午後の半日休暇',
      category: 'time-off',
      schedules: [
        { status: 'off', startTime: 13, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751377820182',
      name: 'custom-1751377820182',
      displayName: '突発休',
      description: '突発的な休暇',
      category: 'time-off',
      schedules: [
        { status: 'unplanned', startTime: 9, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751459461345',
      name: 'custom-1751459461345',
      displayName: '夏季休暇',
      description: '夏季休暇',
      category: 'time-off',
      schedules: [
        { status: 'off', startTime: 9, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751459477450',
      name: 'custom-1751459477450',
      displayName: 'リフレッシュ休暇',
      description: 'リフレッシュ休暇',
      category: 'time-off',
      schedules: [
        { status: 'off', startTime: 9, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751459497713',
      name: 'paidLeave-copy-copy',
      displayName: '人間ドック休',
      description: '人間ドック受診による休暇',
      category: 'time-off',
      schedules: [
        { status: 'trip', startTime: 9, endTime: 14, memo: '' },
        { status: 'off', startTime: 14, endTime: 18, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // 夜間担当カテゴリ
    {
      id: 'night-duty',
      name: 'nightDuty',
      displayName: '夜間担当',
      description: '夜間担当業務',
      category: 'night-duty',
      schedules: [
        { status: 'off', startTime: 9, endTime: 12, memo: '' },
        { status: 'break', startTime: 17, endTime: 18, memo: '' },
        { status: 'night duty', startTime: 18, endTime: 21, memo: '' }
      ],
      representativeScheduleIndex: 2,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751459685077',
      name: 'nightDuty-copy',
      displayName: '夜間担当のみ',
      description: '夜間担当のみの勤務',
      category: 'night-duty',
      schedules: [
        { status: 'night duty', startTime: 18, endTime: 21, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // その他カテゴリ
    {
      id: 'custom-1751379600413',
      name: 'custom-1751379600413',
      displayName: '人間ドック',
      description: '人間ドック受診',
      category: 'special',
      schedules: [
        { status: 'trip', startTime: 9, endTime: 14, memo: '' }
      ],
      representativeScheduleIndex: 0,
      isActive: true,
      customizable: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'custom-1751379703893',
      name: 'custom-1751379703893',
      displayName: '出張',
      description: '出張業務',
      category: 'special',
      schedules: [
        { status: 'trip', startTime: 9, endTime: 18, memo: '' }
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
      enabledPresetIds: [
        'night-duty',
        'paid-leave',
        'custom-1751459171314',
        'custom-1751459196532',
        'custom-1751466304586',
        'custom-1751466316908',
        'custom-1751466327183',
        'custom-1751466335072',
        'custom-1751459477450',
        'custom-1751379703893'
      ],
      defaultPresetId: 'night-duty',
      presetDisplayOrder: [
        'night-duty',
        'paid-leave',
        'custom-1751459171314',
        'custom-1751459196532',
        'custom-1751466304586',
        'custom-1751466316908',
        'custom-1751466327183',
        'custom-1751466335072',
        'custom-1751379703893',
        'custom-1751459477450'
      ]
    },
    personalPage: {
      enabledPresetIds: [
        'night-duty',
        'custom-1751466304586',
        'custom-1751466316908',
        'paid-leave',
        'custom-1751459171314',
        'custom-1751459196532'
      ],
      defaultPresetId: 'night-duty',
      presetDisplayOrder: [
        'night-duty',
        'custom-1751466304586',
        'custom-1751466316908',
        'paid-leave',
        'custom-1751459171314',
        'custom-1751459196532'
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