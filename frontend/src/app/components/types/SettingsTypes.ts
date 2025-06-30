// 設定インポート・エクスポート用の型定義

import { UnifiedPreset, UserPresetSettings } from './PresetTypes';
import { DepartmentGroupSetting } from './MainAppTypes';

// 表示設定
export interface DisplaySettings {
  viewMode: 'normal' | 'compact';
  maskingEnabled: boolean;
  timeRange: 'standard' | 'extended';
  customStatusColors: { [key: string]: string };
  customStatusDisplayNames: { [key: string]: string };
}

// 管理設定（管理者のみ）
export interface ManagementSettings {
  departments: DepartmentGroupSetting[];
  groups: DepartmentGroupSetting[];
}

// エクスポートされる設定の全体構造
export interface ExportedSettings {
  version: string;
  exportedAt: string;
  exportedBy: string;
  appVersion?: string;
  settings: {
    display?: DisplaySettings;
    presets?: UserPresetSettings;
    management?: ManagementSettings;
  };
}

// インポート時の選択可能オプション
export interface ImportOptions {
  includeDisplay: boolean;
  includePresets: boolean;
  includeManagement: boolean;
  overwriteExisting: boolean;
  mergePresets: boolean; // プリセットをマージするか完全置換するか
}

// インポート結果
export interface ImportResult {
  success: boolean;
  message: string;
  details?: {
    displaySettingsImported: boolean;
    presetsImported: number;
    managementSettingsImported: boolean;
    errors: string[];
    warnings: string[];
  };
}

// バリデーション結果
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parsedSettings?: ExportedSettings;
}

// エクスポートオプション
export interface ExportOptions {
  includeDisplay: boolean;
  includePresets: boolean;
  includeManagement: boolean;
  includeMetadata: boolean;
}

// 設定バックアップ履歴（LocalStorage用）
export interface SettingsBackup {
  id: string;
  name: string;
  createdAt: string;
  settings: ExportedSettings;
  isAutoBackup: boolean;
}