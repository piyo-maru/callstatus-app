// 設定インポート・エクスポートのバリデーション機能

import { 
  ExportedSettings, 
  ValidationResult, 
  DisplaySettings, 
  ManagementSettings 
} from '../components/types/SettingsTypes';
import { UserPresetSettings, UnifiedPreset } from '../components/types/PresetTypes';
import { DepartmentGroupSetting } from '../components/types/MainAppTypes';

// サポートされている設定ファイルバージョン
const SUPPORTED_VERSIONS = ['1.0.0'];
const CURRENT_VERSION = '1.0.0';

// ファイルサイズ制限（1MB）
const MAX_FILE_SIZE = 1024 * 1024;

export class SettingsValidator {
  /**
   * JSONファイルの基本バリデーション
   */
  static validateFile(file: File): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`ファイルサイズが大きすぎます（最大1MB）: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // ファイル形式チェック
    if (!file.name.toLowerCase().endsWith('.json')) {
      errors.push('JSONファイルを選択してください');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * JSON文字列のパースとバリデーション
   */
  static async validateJsonContent(jsonContent: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let parsedSettings: ExportedSettings | undefined;

    try {
      // JSON形式チェック
      const parsed = JSON.parse(jsonContent);
      
      // 基本構造チェック
      if (!this.isValidExportedSettings(parsed)) {
        errors.push('設定ファイルの形式が正しくありません');
        return { isValid: false, errors, warnings };
      }

      parsedSettings = parsed as ExportedSettings;

      // バージョンチェック
      if (!SUPPORTED_VERSIONS.includes(parsedSettings.version)) {
        if (parsedSettings.version) {
          warnings.push(`サポートされていないバージョンです: ${parsedSettings.version}`);
        } else {
          warnings.push('バージョン情報がありません');
        }
      }

      // 各設定セクションのバリデーション
      if (parsedSettings.settings.display) {
        const displayValidation = this.validateDisplaySettings(parsedSettings.settings.display);
        errors.push(...displayValidation.errors);
        warnings.push(...displayValidation.warnings);
      }

      if (parsedSettings.settings.presets) {
        const presetsValidation = this.validatePresetSettings(parsedSettings.settings.presets);
        errors.push(...presetsValidation.errors);
        warnings.push(...presetsValidation.warnings);
      }

      if (parsedSettings.settings.management) {
        const managementValidation = this.validateManagementSettings(parsedSettings.settings.management);
        errors.push(...managementValidation.errors);
        warnings.push(...managementValidation.warnings);
      }

    } catch (parseError) {
      errors.push(`JSONファイルの解析に失敗しました: ${parseError instanceof Error ? parseError.message : 'unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      parsedSettings
    };
  }

  /**
   * ExportedSettings型の基本構造チェック
   */
  private static isValidExportedSettings(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.version === 'string' &&
      typeof obj.exportedAt === 'string' &&
      typeof obj.exportedBy === 'string' &&
      obj.settings &&
      typeof obj.settings === 'object'
    );
  }

  /**
   * 表示設定のバリデーション
   */
  private static validateDisplaySettings(settings: any): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!settings || typeof settings !== 'object') {
      errors.push('表示設定の形式が正しくありません');
      return { errors, warnings };
    }

    // maskingEnabledチェック
    if (settings.maskingEnabled !== undefined && typeof settings.maskingEnabled !== 'boolean') {
      warnings.push('マスキング設定は真偽値である必要があります');
    }

    // timeRangeチェック
    if (settings.timeRange && !['standard', 'extended'].includes(settings.timeRange)) {
      warnings.push(`無効な時間範囲設定: ${settings.timeRange}`);
    }

    // カスタム色設定チェック
    if (settings.customStatusColors) {
      if (typeof settings.customStatusColors !== 'object') {
        warnings.push('カスタムステータス色設定の形式が正しくありません');
      } else {
        Object.entries(settings.customStatusColors).forEach(([status, color]) => {
          if (typeof color !== 'string' || !this.isValidColorCode(color as string)) {
            warnings.push(`無効な色コード: ${status} = ${color}`);
          }
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * プリセット設定のバリデーション
   */
  private static validatePresetSettings(settings: any): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!settings || typeof settings !== 'object') {
      errors.push('プリセット設定の形式が正しくありません');
      return { errors, warnings };
    }

    // プリセット配列チェック
    if (settings.presets) {
      if (!Array.isArray(settings.presets)) {
        errors.push('プリセットは配列である必要があります');
      } else {
        settings.presets.forEach((preset: any, index: number) => {
          const presetValidation = this.validatePreset(preset, index);
          errors.push(...presetValidation.errors);
          warnings.push(...presetValidation.warnings);
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * 個別プリセットのバリデーション
   */
  private static validatePreset(preset: any, index: number): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!preset || typeof preset !== 'object') {
      errors.push(`プリセット[${index}]の形式が正しくありません`);
      return { errors, warnings };
    }

    // 必須フィールドチェック
    const requiredFields = ['id', 'name', 'displayName', 'category', 'schedules'];
    requiredFields.forEach(field => {
      if (!preset[field]) {
        errors.push(`プリセット[${index}]に必須フィールド '${field}' がありません`);
      }
    });

    // カテゴリチェック
    const validCategories = ['general', 'time-off', 'special', 'night-duty'];
    if (preset.category && !validCategories.includes(preset.category)) {
      warnings.push(`プリセット[${index}]に無効なカテゴリ: ${preset.category}`);
    }

    // スケジュール配列チェック
    if (preset.schedules) {
      if (!Array.isArray(preset.schedules)) {
        errors.push(`プリセット[${index}]のスケジュールは配列である必要があります`);
      } else {
        preset.schedules.forEach((schedule: any, scheduleIndex: number) => {
          if (!schedule.status || typeof schedule.startTime !== 'number' || typeof schedule.endTime !== 'number') {
            warnings.push(`プリセット[${index}]のスケジュール[${scheduleIndex}]に不正な値があります`);
          }
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * 管理設定のバリデーション
   */
  private static validateManagementSettings(settings: any): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!settings || typeof settings !== 'object') {
      errors.push('管理設定の形式が正しくありません');
      return { errors, warnings };
    }

    // 部署設定チェック
    if (settings.departments && !Array.isArray(settings.departments)) {
      warnings.push('部署設定は配列である必要があります');
    }

    // グループ設定チェック
    if (settings.groups && !Array.isArray(settings.groups)) {
      warnings.push('グループ設定は配列である必要があります');
    }

    return { errors, warnings };
  }

  /**
   * 色コードの妥当性チェック
   */
  private static isValidColorCode(color: string): boolean {
    if (!color || typeof color !== 'string') return false;
    
    // HEX色コード（#RRGGBB or #RGB）をチェック
    const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    
    // RGB/RGBA形式もサポート
    const rgbPattern = /^rgba?\(\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*(,\s*([01](\.\d+)?))?\s*\)$/;
    
    // CSS色名もサポート（基本的なもの）
    const cssColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey'];
    
    return hexPattern.test(color) || rgbPattern.test(color) || cssColors.includes(color.toLowerCase());
  }

  /**
   * ファイルサイズを人間が読みやすい形式に変換
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 設定ファイルの統計情報を取得
   */
  static getSettingsStatistics(settings: ExportedSettings): {
    presetsCount: number;
    departmentsCount: number;
    groupsCount: number;
    customColorsCount: number;
    customDisplayNamesCount: number;
  } {
    return {
      presetsCount: settings.settings.presets?.presets?.length || 0,
      departmentsCount: settings.settings.management?.departments?.length || 0,
      groupsCount: settings.settings.management?.groups?.length || 0,
      customColorsCount: Object.keys(settings.settings.display?.customStatusColors || {}).length,
      customDisplayNamesCount: Object.keys(settings.settings.display?.customStatusDisplayNames || {}).length
    };
  }

  /**
   * エクスポート用設定の作成
   */
  static createExportedSettings(
    display?: DisplaySettings,
    presets?: UserPresetSettings,
    management?: ManagementSettings,
    exportedBy?: string
  ): ExportedSettings {
    return {
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: exportedBy || 'Unknown User',
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      settings: {
        ...(display && { display }),
        ...(presets && { presets }),
        ...(management && { management })
      }
    };
  }
}