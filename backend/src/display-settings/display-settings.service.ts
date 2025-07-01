import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GlobalDisplaySettings } from '@prisma/client';

export interface DisplaySettingsDto {
  viewMode: string;
  maskingEnabled: boolean;
  timeRange: string;
  customStatusColors: Record<string, string>;
  customStatusDisplayNames: Record<string, string>;
}

@Injectable()
export class DisplaySettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * グローバル表示設定を取得
   * レコードが存在しない場合はデフォルト設定で初期化
   */
  async getSettings(): Promise<DisplaySettingsDto> {
    let settings = await this.prisma.globalDisplaySettings.findFirst({
      where: { id: 1 }
    });

    // 設定が存在しない場合はデフォルト設定で初期化
    if (!settings) {
      settings = await this.initializeDefaultSettings();
    }

    return {
      viewMode: settings.viewMode,
      maskingEnabled: settings.maskingEnabled,
      timeRange: settings.timeRange,
      customStatusColors: settings.customStatusColors as Record<string, string>,
      customStatusDisplayNames: settings.customStatusDisplayNames as Record<string, string>,
    };
  }

  /**
   * グローバル表示設定を更新
   */
  async updateSettings(
    updateData: Partial<DisplaySettingsDto>,
    updatedByStaffId?: number
  ): Promise<DisplaySettingsDto> {
    // まず現在の設定を取得（存在しない場合は初期化）
    await this.getSettings();

    const settings = await this.prisma.globalDisplaySettings.upsert({
      where: { id: 1 },
      update: {
        ...(updateData.viewMode !== undefined && { viewMode: updateData.viewMode }),
        ...(updateData.maskingEnabled !== undefined && { maskingEnabled: updateData.maskingEnabled }),
        ...(updateData.timeRange !== undefined && { timeRange: updateData.timeRange }),
        ...(updateData.customStatusColors !== undefined && { customStatusColors: updateData.customStatusColors }),
        ...(updateData.customStatusDisplayNames !== undefined && { customStatusDisplayNames: updateData.customStatusDisplayNames }),
        updatedBy: updatedByStaffId || null,
      },
      create: {
        id: 1,
        viewMode: updateData.viewMode || 'normal',
        maskingEnabled: updateData.maskingEnabled || false,
        timeRange: updateData.timeRange || 'standard',
        customStatusColors: updateData.customStatusColors || {},
        customStatusDisplayNames: updateData.customStatusDisplayNames || {},
        updatedBy: updatedByStaffId || null,
      },
    });

    return {
      viewMode: settings.viewMode,
      maskingEnabled: settings.maskingEnabled,
      timeRange: settings.timeRange,
      customStatusColors: settings.customStatusColors as Record<string, string>,
      customStatusDisplayNames: settings.customStatusDisplayNames as Record<string, string>,
    };
  }

  /**
   * デフォルト設定で初期化
   */
  private async initializeDefaultSettings(): Promise<GlobalDisplaySettings> {
    return this.prisma.globalDisplaySettings.create({
      data: {
        id: 1,
        viewMode: 'normal',
        maskingEnabled: false,
        timeRange: 'standard',
        customStatusColors: {},
        customStatusDisplayNames: {},
      },
    });
  }

  /**
   * 設定の履歴・監査情報を取得
   */
  async getSettingsHistory(): Promise<{
    settings: DisplaySettingsDto;
    lastUpdatedAt: Date | null;
    lastUpdatedBy: { id: number; name: string } | null;
  }> {
    const settings = await this.prisma.globalDisplaySettings.findFirst({
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
          viewMode: defaultSettings.viewMode,
          maskingEnabled: defaultSettings.maskingEnabled,
          timeRange: defaultSettings.timeRange,
          customStatusColors: defaultSettings.customStatusColors as Record<string, string>,
          customStatusDisplayNames: defaultSettings.customStatusDisplayNames as Record<string, string>,
        },
        lastUpdatedAt: null,
        lastUpdatedBy: null,
      };
    }

    return {
      settings: {
        viewMode: settings.viewMode,
        maskingEnabled: settings.maskingEnabled,
        timeRange: settings.timeRange,
        customStatusColors: settings.customStatusColors as Record<string, string>,
        customStatusDisplayNames: settings.customStatusDisplayNames as Record<string, string>,
      },
      lastUpdatedAt: settings.updatedAt,
      lastUpdatedBy: settings.UpdatedByStaff,
    };
  }
}