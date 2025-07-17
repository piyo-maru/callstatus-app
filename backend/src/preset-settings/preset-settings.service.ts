import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// DTOs とインターフェース
export interface PresetScheduleItemDto {
  status: string;
  startTime: number;  // 小数点形式 (例: 9.5 = 9:30)
  endTime: number;
  memo?: string;
  sortOrder?: number;
}

export interface UnifiedPresetDto {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: 'general' | 'time-off' | 'special' | 'night-duty';
  schedules: PresetScheduleItemDto[];
  isActive: boolean;
  customizable: boolean;
  isDefault: boolean;
}

export interface PagePresetSettingsDto {
  monthlyPlanner: {
    enabledPresetIds: string[];
    defaultPresetId?: string;
  };
  personalPage: {
    enabledPresetIds: string[];
    defaultPresetId?: string;
  };
}

export interface UserPresetSettingsDto {
  staffId: number;
  presets: UnifiedPresetDto[];
  pagePresetSettings: PagePresetSettingsDto;
  lastModified: string;
}

export interface CreatePresetDto {
  presetId: string;
  name: string;
  displayName: string;
  description?: string;
  category: 'general' | 'time-off' | 'special' | 'night-duty';
  schedules: PresetScheduleItemDto[];
  isActive?: boolean;
  customizable?: boolean;
  isDefault?: boolean;
}

export interface UpdatePresetDto {
  name?: string;
  displayName?: string;
  description?: string;
  category?: 'general' | 'time-off' | 'special' | 'night-duty';
  schedules?: PresetScheduleItemDto[];
  isActive?: boolean;
  customizable?: boolean;
  isDefault?: boolean;
}

@Injectable()
export class PresetSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 特定スタッフのプリセット設定を取得（存在しない場合はデフォルト設定を作成）
   */
  async getUserPresetSettings(staffId: number): Promise<UserPresetSettingsDto> {
    // 既存のプリセット設定を取得
    let userPresetSettings = await this.prisma.user_preset_settings.findUnique({
      where: { staffId },
      include: {
        UserPresets: {
          include: {
            UserPresetSchedules: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });

    // 存在しない場合はデフォルト設定を作成
    if (!userPresetSettings) {
      userPresetSettings = await this.createDefaultPresetSettings(staffId);
    }

    // DTOに変換して返す
    return this.convertToUserPresetSettingsDto(userPresetSettings);
  }

  /**
   * プリセット設定を更新
   */
  async updateUserPresetSettings(
    staffId: number,
    pagePresetSettings: PagePresetSettingsDto
  ): Promise<UserPresetSettingsDto> {
    // 既存設定を取得または作成
    await this.ensureUserPresetSettingsExists(staffId);

    // ページ別プリセット設定を更新
    const updated = await this.prisma.user_preset_settings.update({
      where: { staffId },
      data: {
        pagePresetSettings: pagePresetSettings as any,
        lastModified: new Date(),
        updatedAt: new Date()
      },
      include: {
        UserPresets: {
          include: {
            UserPresetSchedules: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });

    return this.convertToUserPresetSettingsDto(updated);
  }

  /**
   * 新しいプリセットを追加
   */
  async createPreset(staffId: number, presetData: CreatePresetDto): Promise<UnifiedPresetDto> {
    // ユーザー設定が存在することを確認
    const userSettings = await this.ensureUserPresetSettingsExists(staffId);

    // 同じpresetIdが既に存在するかチェック
    const existingPreset = await this.prisma.user_presets.findUnique({
      where: {
        userPresetSettingsId_presetId: {
          userPresetSettingsId: userSettings.id,
          presetId: presetData.presetId
        }
      }
    });

    if (existingPreset) {
      throw new Error(`Preset with ID '${presetData.presetId}' already exists`);
    }

    // プリセットを作成
    const newPreset = await this.prisma.user_presets.create({
      data: {
        userPresetSettingsId: userSettings.id,
        presetId: presetData.presetId,
        name: presetData.name,
        displayName: presetData.displayName,
        description: presetData.description,
        category: presetData.category,
        isActive: presetData.isActive ?? true,
        customizable: presetData.customizable ?? true,
        isDefault: presetData.isDefault ?? false,
        UserPresetSchedules: {
          createMany: {
            data: presetData.schedules.map((schedule, index) => ({
              status: schedule.status,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              memo: schedule.memo,
              sortOrder: schedule.sortOrder ?? index
            }))
          }
        }
      },
      include: {
        UserPresetSchedules: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    return this.convertToUnifiedPresetDto(newPreset);
  }

  /**
   * プリセットを更新
   */
  async updatePreset(
    staffId: number,
    presetId: string,
    updateData: UpdatePresetDto
  ): Promise<UnifiedPresetDto> {
    // ユーザー設定を取得
    const userSettings = await this.prisma.user_preset_settings.findUnique({
      where: { staffId }
    });

    if (!userSettings) {
      throw new Error('User preset settings not found');
    }

    // プリセットを取得
    const existingPreset = await this.prisma.user_presets.findUnique({
      where: {
        userPresetSettingsId_presetId: {
          userPresetSettingsId: userSettings.id,
          presetId: presetId
        }
      }
    });

    if (!existingPreset) {
      throw new Error(`Preset '${presetId}' not found`);
    }

    // プリセット基本情報を更新
    const updatePresetData: any = {};
    if (updateData.name !== undefined) updatePresetData.name = updateData.name;
    if (updateData.displayName !== undefined) updatePresetData.displayName = updateData.displayName;
    if (updateData.description !== undefined) updatePresetData.description = updateData.description;
    if (updateData.category !== undefined) updatePresetData.category = updateData.category;
    if (updateData.isActive !== undefined) updatePresetData.isActive = updateData.isActive;
    if (updateData.customizable !== undefined) updatePresetData.customizable = updateData.customizable;
    if (updateData.isDefault !== undefined) updatePresetData.isDefault = updateData.isDefault;

    // スケジュールが更新される場合は既存のスケジュールを削除して再作成
    if (updateData.schedules) {
      await this.prisma.user_presetsSchedule.deleteMany({
        where: { userPresetId: existingPreset.id }
      });
    }

    const updatedPreset = await this.prisma.user_presets.update({
      where: { id: existingPreset.id },
      data: {
        ...updatePresetData,
        updatedAt: new Date(),
        ...(updateData.schedules && {
          UserPresetSchedules: {
            createMany: {
              data: updateData.schedules.map((schedule, index) => ({
                status: schedule.status,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                memo: schedule.memo,
                sortOrder: schedule.sortOrder ?? index
              }))
            }
          }
        })
      },
      include: {
        UserPresetSchedules: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    return this.convertToUnifiedPresetDto(updatedPreset);
  }

  /**
   * プリセットを削除
   */
  async deletePreset(staffId: number, presetId: string): Promise<void> {
    // ユーザー設定を取得
    const userSettings = await this.prisma.user_preset_settings.findUnique({
      where: { staffId }
    });

    if (!userSettings) {
      throw new Error('User preset settings not found');
    }

    // プリセットを削除（CASCADE設定により関連するスケジュールも自動削除される）
    const deleteResult = await this.prisma.user_presets.deleteMany({
      where: {
        userPresetSettingsId: userSettings.id,
        presetId: presetId
      }
    });

    if (deleteResult.count === 0) {
      throw new Error(`Preset '${presetId}' not found`);
    }
  }

  /**
   * 管理者用：全ユーザーのプリセット統計を取得
   */
  async getPresetStatistics() {
    const totalUsers = await this.prisma.user_preset_settings.count();
    const totalPresets = await this.prisma.user_presets.count();
    const categoryStats = await this.prisma.user_presets.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    });

    return {
      totalUsers,
      totalPresets,
      categoryStats: categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count.category
      }))
    };
  }

  // === プライベートヘルパーメソッド ===

  /**
   * ユーザープリセット設定が存在することを確認（存在しない場合は作成）
   */
  private async ensureUserPresetSettingsExists(staffId: number) {
    let userSettings = await this.prisma.user_preset_settings.findUnique({
      where: { staffId }
    });

    if (!userSettings) {
      userSettings = await this.createDefaultPresetSettings(staffId);
    }

    return userSettings;
  }

  /**
   * デフォルトプリセット設定を作成
   */
  private async createDefaultPresetSettings(staffId: number) {
    // 管理者用固定ID（999）の場合はスタッフチェックをスキップ
    if (staffId !== 999) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: staffId }
      });

      if (!staff) {
        throw new Error(`Staff with ID ${staffId} not found`);
      }
    }

    // デフォルトのページ別プリセット設定
    const defaultPageSettings = {
      monthlyPlanner: {
        enabledPresetIds: ['standard-work', 'remote-work', 'morning-only', 'afternoon-only', 'off'],
        defaultPresetId: 'standard-work'
      },
      personalPage: {
        enabledPresetIds: ['standard-work', 'remote-work', 'morning-only', 'afternoon-only', 'off'],
        defaultPresetId: 'standard-work'
      }
    };

    // UserPresetSettingsを作成
    const userPresetSettings = await this.prisma.user_preset_settings.create({
      data: {
        staffId,
        pagePresetSettings: defaultPageSettings
      }
    });

    // デフォルトプリセットを作成（スケジュール付き）
    const defaultPresets = this.getDefaultPresetsWithSchedules();
    
    for (const presetData of defaultPresets) {
      await this.prisma.user_presets.create({
        data: {
          userPresetSettingsId: userPresetSettings.id,
          presetId: presetData.presetId,
          name: presetData.name,
          displayName: presetData.displayName,
          description: presetData.description,
          category: presetData.category,
          isActive: presetData.isActive,
          customizable: presetData.customizable,
          isDefault: presetData.isDefault,
          UserPresetSchedules: {
            createMany: {
              data: presetData.schedules.map((schedule, index) => ({
                status: schedule.status,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                memo: schedule.memo,
                sortOrder: index
              }))
            }
          }
        }
      });
    }

    // 作成された設定を取得して返す
    return await this.prisma.user_preset_settings.findUnique({
      where: { id: userPresetSettings.id },
      include: {
        UserPresets: {
          include: {
            UserPresetSchedules: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });
  }

  /**
   * デフォルトプリセット定義を取得
   */
  private getDefaultPresets() {
    // 基本的なプリセットのみを含める（スケジュールは別途作成）
    return [
      {
        presetId: 'standard-work',
        name: 'standard-work',
        displayName: '標準勤務',
        description: '一般的な勤務時間（9:00-18:00）',
        category: 'general',
        isActive: true,
        customizable: true,
        isDefault: true
      },
      {
        presetId: 'remote-work',
        name: 'remote-work',
        displayName: 'リモート勤務',
        description: 'リモートワーク（9:00-18:00）',
        category: 'general',
        isActive: true,
        customizable: true,
        isDefault: false
      },
      {
        presetId: 'off',
        name: 'off',
        displayName: '休み',
        description: '休暇・休日',
        category: 'time-off',
        isActive: true,
        customizable: false,
        isDefault: false
      }
    ];
  }

  /**
   * スケジュール情報を含むデフォルトプリセット定義を取得
   * フロントエンドのPresetSchedules.tsと同期
   */
  private getDefaultPresetsWithSchedules() {
    return [
      // 一般勤務カテゴリ
      {
        presetId: 'full-time-employee',
        name: 'full-time-employee',
        displayName: '正社員',
        description: '9:00-12:00 + 昼休み + 13:00-18:00の正社員勤務',
        category: 'general',
        isActive: true,
        customizable: true,
        isDefault: true,
        schedules: [
          {
            status: 'online',
            startTime: 9.0,
            endTime: 12.0,
            memo: ''
          },
          {
            status: 'break',
            startTime: 12.0,
            endTime: 13.0,
            memo: ''
          },
          {
            status: 'online',
            startTime: 13.0,
            endTime: 18.0,
            memo: ''
          }
        ]
      },
      {
        presetId: 'part-time-employee',
        name: 'part-time-employee',
        displayName: 'パートタイマー',
        description: '9:00-12:00 + 昼休み + 13:00-16:00のパートタイム勤務',
        category: 'general',
        isActive: true,
        customizable: true,
        isDefault: true,
        schedules: [
          {
            status: 'online',
            startTime: 9.0,
            endTime: 12.0,
            memo: ''
          },
          {
            status: 'break',
            startTime: 12.0,
            endTime: 13.0,
            memo: ''
          },
          {
            status: 'online',
            startTime: 13.0,
            endTime: 16.0,
            memo: ''
          }
        ]
      },
      {
        presetId: 'remote-full-time',
        name: 'remote-full-time',
        displayName: '在宅勤務（正社員）',
        description: '9:00-12:00 + 昼休み + 13:00-18:00の在宅正社員勤務',
        category: 'general',
        isActive: true,
        customizable: true,
        isDefault: true,
        schedules: [
          {
            status: 'remote',
            startTime: 9.0,
            endTime: 12.0,
            memo: ''
          },
          {
            status: 'break',
            startTime: 12.0,
            endTime: 13.0,
            memo: ''
          },
          {
            status: 'remote',
            startTime: 13.0,
            endTime: 18.0,
            memo: ''
          }
        ]
      },
      {
        presetId: 'remote-part-time',
        name: 'remote-part-time',
        displayName: '在宅勤務（パートタイマー）',
        description: '9:00-12:00 + 昼休み + 13:00-16:00の在宅パートタイム勤務',
        category: 'general',
        isActive: true,
        customizable: true,
        isDefault: true,
        schedules: [
          {
            status: 'remote',
            startTime: 9.0,
            endTime: 12.0,
            memo: ''
          },
          {
            status: 'break',
            startTime: 12.0,
            endTime: 13.0,
            memo: ''
          },
          {
            status: 'remote',
            startTime: 13.0,
            endTime: 16.0,
            memo: ''
          }
        ]
      },
      // 休暇カテゴリ
      {
        presetId: 'full-day-off',
        name: 'full-day-off',
        displayName: '終日休み',
        description: '一日中休暇',
        category: 'time-off',
        isActive: true,
        customizable: false,
        isDefault: true,
        schedules: [
          {
            status: 'off',
            startTime: 9.0,
            endTime: 18.0,
            memo: '終日休暇'
          }
        ]
      },
      {
        presetId: 'sudden-off',
        name: 'sudden-off',
        displayName: '突発休',
        description: '突発的な休暇',
        category: 'time-off',
        isActive: true,
        customizable: false,
        isDefault: true,
        schedules: [
          {
            status: 'off',
            startTime: 9.0,
            endTime: 18.0,
            memo: '突発休'
          }
        ]
      },
      {
        presetId: 'morning-off',
        name: 'morning-off',
        displayName: '午前休',
        description: '午前中休暇',
        category: 'time-off',
        isActive: true,
        customizable: false,
        isDefault: true,
        schedules: [
          {
            status: 'off',
            startTime: 9.0,
            endTime: 13.0,
            memo: '午前休'
          }
        ]
      },
      {
        presetId: 'afternoon-off',
        name: 'afternoon-off',
        displayName: '午後休',
        description: '午後休暇',
        category: 'time-off',
        isActive: true,
        customizable: false,
        isDefault: true,
        schedules: [
          {
            status: 'off',
            startTime: 13.0,
            endTime: 18.0,
            memo: '午後休'
          }
        ]
      },
      {
        presetId: 'lunch-break',
        name: 'lunch-break',
        displayName: '昼休み',
        description: '12:00-13:00の昼休憩',
        category: 'time-off',
        isActive: true,
        customizable: false,
        isDefault: true,
        schedules: [
          {
            status: 'break',
            startTime: 12.0,
            endTime: 13.0,
            memo: '昼休憩'
          }
        ]
      },
      // 夜間担当カテゴリ
      {
        presetId: 'night-duty',
        name: 'night-duty',
        displayName: '夜間担当',
        description: '18:00-21:00の夜間担当',
        category: 'night-duty',
        isActive: true,
        customizable: true,
        isDefault: true,
        schedules: [
          {
            status: 'night duty',
            startTime: 18.0,
            endTime: 21.0,
            memo: '夜間担当'
          }
        ]
      },
      {
        presetId: 'night-duty-extended',
        name: 'night-duty-extended',
        displayName: '夜間担当(延長)',
        description: '17:00-21:00の夜間担当(延長)',
        category: 'night-duty',
        isActive: true,
        customizable: true,
        isDefault: true,
        schedules: [
          {
            status: 'night duty',
            startTime: 17.0,
            endTime: 21.0,
            memo: '夜間担当(延長)'
          }
        ]
      },
      // その他カテゴリ
      {
        presetId: 'meeting-block',
        name: 'meeting-block',
        displayName: '会議ブロック',
        description: '14:00-15:00の会議時間',
        category: 'special',
        isActive: true,
        customizable: true,
        isDefault: true,
        schedules: [
          {
            status: 'meeting',
            startTime: 14.0,
            endTime: 15.0,
            memo: '定例会議'
          }
        ]
      },
      {
        presetId: 'training',
        name: 'training',
        displayName: '研修・トレーニング',
        description: '10:00-16:00の研修時間',
        category: 'special',
        isActive: true,
        customizable: true,
        isDefault: true,
        schedules: [
          {
            status: 'training',
            startTime: 10.0,
            endTime: 16.0,
            memo: '研修・トレーニング'
          }
        ]
      }
    ];
  }

  /**
   * データベースエンティティをDTOに変換
   */
  private convertToUserPresetSettingsDto(dbEntity: any): UserPresetSettingsDto {
    return {
      staffId: dbEntity.staffId,
      presets: dbEntity.UserPresets.map(preset => this.convertToUnifiedPresetDto(preset)),
      pagePresetSettings: dbEntity.pagePresetSettings || {
        monthlyPlanner: { enabledPresetIds: [], defaultPresetId: undefined },
        personalPage: { enabledPresetIds: [], defaultPresetId: undefined }
      },
      lastModified: dbEntity.lastModified.toISOString()
    };
  }

  /**
   * プリセットエンティティをDTOに変換
   */
  private convertToUnifiedPresetDto(dbPreset: any): UnifiedPresetDto {
    return {
      id: dbPreset.presetId,
      name: dbPreset.name,
      displayName: dbPreset.displayName,
      description: dbPreset.description,
      category: dbPreset.category,
      schedules: dbPreset.UserPresetSchedules?.map(schedule => ({
        status: schedule.status,
        startTime: parseFloat(schedule.startTime.toString()),
        endTime: parseFloat(schedule.endTime.toString()),
        memo: schedule.memo,
        sortOrder: schedule.sortOrder
      })) || [],
      isActive: dbPreset.isActive,
      customizable: dbPreset.customizable,
      isDefault: dbPreset.isDefault
    };
  }
}