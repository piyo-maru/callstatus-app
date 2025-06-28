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
    let userPresetSettings = await this.prisma.userPresetSettings.findUnique({
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
    const updated = await this.prisma.userPresetSettings.update({
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
    const existingPreset = await this.prisma.userPreset.findUnique({
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
    const newPreset = await this.prisma.userPreset.create({
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
    const userSettings = await this.prisma.userPresetSettings.findUnique({
      where: { staffId }
    });

    if (!userSettings) {
      throw new Error('User preset settings not found');
    }

    // プリセットを取得
    const existingPreset = await this.prisma.userPreset.findUnique({
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
      await this.prisma.userPresetSchedule.deleteMany({
        where: { userPresetId: existingPreset.id }
      });
    }

    const updatedPreset = await this.prisma.userPreset.update({
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
    const userSettings = await this.prisma.userPresetSettings.findUnique({
      where: { staffId }
    });

    if (!userSettings) {
      throw new Error('User preset settings not found');
    }

    // プリセットを削除（CASCADE設定により関連するスケジュールも自動削除される）
    const deleteResult = await this.prisma.userPreset.deleteMany({
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
    const totalUsers = await this.prisma.userPresetSettings.count();
    const totalPresets = await this.prisma.userPreset.count();
    const categoryStats = await this.prisma.userPreset.groupBy({
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
    let userSettings = await this.prisma.userPresetSettings.findUnique({
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
    // スタッフの存在確認
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId }
    });

    if (!staff) {
      throw new Error(`Staff with ID ${staffId} not found`);
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
    const userPresetSettings = await this.prisma.userPresetSettings.create({
      data: {
        staffId,
        pagePresetSettings: defaultPageSettings
      }
    });

    // デフォルトプリセットを作成（スケジュール付き）
    const defaultPresets = this.getDefaultPresetsWithSchedules();
    
    for (const presetData of defaultPresets) {
      await this.prisma.userPreset.create({
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
    return await this.prisma.userPresetSettings.findUnique({
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
   */
  private getDefaultPresetsWithSchedules() {
    return [
      {
        presetId: 'standard-work',
        name: 'standard-work',
        displayName: '標準勤務',
        description: '一般的な勤務時間（9:00-18:00）',
        category: 'general',
        isActive: true,
        customizable: true,
        isDefault: true,
        schedules: [
          {
            status: 'online',
            startTime: 9.0,   // 9:00
            endTime: 18.0,    // 18:00
            memo: '標準勤務時間'
          }
        ]
      },
      {
        presetId: 'remote-work',
        name: 'remote-work',
        displayName: 'リモート勤務',
        description: 'リモートワーク（9:00-18:00）',
        category: 'general',
        isActive: true,
        customizable: true,
        isDefault: false,
        schedules: [
          {
            status: 'remote',
            startTime: 9.0,   // 9:00
            endTime: 18.0,    // 18:00
            memo: 'リモート勤務'
          }
        ]
      },
      {
        presetId: 'morning-only',
        name: 'morning-only',
        displayName: '午前のみ',
        description: '午前中のみ勤務（9:00-12:00）',
        category: 'general',
        isActive: true,
        customizable: true,
        isDefault: false,
        schedules: [
          {
            status: 'online',
            startTime: 9.0,   // 9:00
            endTime: 12.0,    // 12:00
            memo: '午前のみ勤務'
          }
        ]
      },
      {
        presetId: 'afternoon-only',
        name: 'afternoon-only',
        displayName: '午後のみ',
        description: '午後のみ勤務（13:00-18:00）',
        category: 'general',
        isActive: true,
        customizable: true,
        isDefault: false,
        schedules: [
          {
            status: 'online',
            startTime: 13.0,  // 13:00
            endTime: 18.0,    // 18:00
            memo: '午後のみ勤務'
          }
        ]
      },
      {
        presetId: 'off',
        name: 'off',
        displayName: '休み',
        description: '休暇・休日',
        category: 'time-off',
        isActive: true,
        customizable: false,
        isDefault: false,
        schedules: [
          {
            status: 'off',
            startTime: 0.0,
            endTime: 0.0,
            memo: '休暇・休日'
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