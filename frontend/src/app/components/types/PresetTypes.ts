// 統一プリセットシステムの型定義

export interface PresetScheduleItem {
  status: string;
  startTime: number;  // 小数点形式 (例: 9.5 = 9:30)
  endTime: number;
  memo?: string;
}

export interface UnifiedPreset {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: 'general' | 'time-off' | 'special' | 'night-duty';
  schedules: PresetScheduleItem[];
  representativeScheduleIndex?: number;  // 代表色として使用するスケジュールのインデックス（デフォルト: 0）
  isActive: boolean;
  customizable: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PresetCategory {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  color: string;
  icon?: string;
}

export interface UserPresetSettings {
  userId?: string;
  presets: UnifiedPreset[];
  categories: PresetCategory[];
  pagePresetSettings: {
    monthlyPlanner: {
      enabledPresetIds: string[];
      defaultPresetId?: string;
    };
    personalPage: {
      enabledPresetIds: string[];
      defaultPresetId?: string;
    };
  };
  lastModified: string;
}

// 既存のPresetSchedule型との互換性のための型
export interface LegacyPresetSchedule {
  key?: string;
  id?: string;
  label?: string;
  name?: string;
  status: string;
  start: number;
  end: number;
  timeDisplay?: string;
  schedules?: Array<{
    status: string;
    startTime: number;
    endTime: number;
    memo?: string;
  }>;
}

// プリセット設定のフィルタリング・検索用
export interface PresetFilter {
  category?: string;
  isActive?: boolean;
  searchQuery?: string;
  customizable?: boolean;
}

// プリセット編集用の型
export interface PresetEditFormData {
  name: string;
  displayName: string;
  description: string;
  category: 'general' | 'time-off' | 'special' | 'night-duty';
  schedules: PresetScheduleItem[];
  representativeScheduleIndex?: number;  // 代表色として使用するスケジュールのインデックス
  isActive: boolean;
  customizable: boolean;
}