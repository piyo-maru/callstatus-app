// 統一プリセットスケジュール定義

import { UnifiedPreset, PresetCategory } from '../types/PresetTypes';

// プリセットカテゴリ定義
export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'general',
    name: 'general',
    displayName: '一般勤務',
    description: '通常の勤務パターン',
    color: '#22c55e',
    icon: '💼'
  },
  {
    id: 'time-off',
    name: 'time-off',
    displayName: '休暇・休み',
    description: '休暇、半休、その他の休み',
    color: '#ef4444',
    icon: '🏖️'
  },
  {
    id: 'special',
    name: 'special',
    displayName: '特殊勤務',
    description: '夜間担当、研修、会議など',
    color: '#3b82f6',
    icon: '⭐'
  },
  {
    id: 'night-duty',
    name: 'night-duty',
    displayName: '夜間担当',
    description: '夜間・深夜時間帯の勤務',
    color: '#4f46e5',
    icon: '🌙'
  }
];

// デフォルトプリセット定義（月次プランナー・個人ページ両方で使用）
export const DEFAULT_UNIFIED_PRESETS: UnifiedPreset[] = [
  // 一般勤務カテゴリ
  {
    id: 'standard-work',
    name: 'standard-work',
    displayName: '標準勤務',
    description: '9:00-18:00の標準的な勤務時間',
    category: 'general',
    schedules: [
      {
        status: 'online',
        startTime: 9,
        endTime: 18,
        memo: '標準勤務時間'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  },
  {
    id: 'early-work',
    name: 'early-work', 
    displayName: '早番勤務',
    description: '8:00-17:00の早番勤務',
    category: 'general',
    schedules: [
      {
        status: 'online',
        startTime: 8,
        endTime: 17,
        memo: '早番勤務'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  },
  {
    id: 'late-work',
    name: 'late-work',
    displayName: '遅番勤務', 
    description: '10:00-19:00の遅番勤務',
    category: 'general',
    schedules: [
      {
        status: 'online',
        startTime: 10,
        endTime: 19,
        memo: '遅番勤務'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  },
  {
    id: 'short-time-work',
    name: 'short-time-work',
    displayName: '時短勤務',
    description: '10:00-15:00の時短勤務',
    category: 'general',
    schedules: [
      {
        status: 'online',
        startTime: 10,
        endTime: 15,
        memo: '時短勤務'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  },
  {
    id: 'remote-work',
    name: 'remote-work',
    displayName: '在宅勤務',
    description: '9:00-18:00の在宅勤務',
    category: 'general',
    schedules: [
      {
        status: 'remote',
        startTime: 9,
        endTime: 18,
        memo: '在宅勤務'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  },

  // 休暇カテゴリ
  {
    id: 'full-day-off',
    name: 'full-day-off',
    displayName: '終日休み',
    description: '一日中休暇',
    category: 'time-off',
    schedules: [
      {
        status: 'off',
        startTime: 9,
        endTime: 18,
        memo: '終日休暇'
      }
    ],
    isActive: true,
    customizable: false,
    isDefault: true
  },
  {
    id: 'morning-off',
    name: 'morning-off',
    displayName: '午前休',
    description: '午前中休暇',
    category: 'time-off',
    schedules: [
      {
        status: 'off',
        startTime: 9,
        endTime: 13,
        memo: '午前休'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  },
  {
    id: 'afternoon-off',
    name: 'afternoon-off',
    displayName: '午後休',
    description: '午後休暇',
    category: 'time-off',
    schedules: [
      {
        status: 'off',
        startTime: 13,
        endTime: 18,
        memo: '午後休'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  },

  // 特殊勤務カテゴリ
  {
    id: 'meeting-block',
    name: 'meeting-block',
    displayName: '会議ブロック',
    description: '14:00-15:00の会議時間',
    category: 'special',
    schedules: [
      {
        status: 'meeting',
        startTime: 14,
        endTime: 15,
        memo: '定例会議'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  },
  {
    id: 'training',
    name: 'training',
    displayName: '研修・トレーニング',
    description: '10:00-16:00の研修時間',
    category: 'special',
    schedules: [
      {
        status: 'training',
        startTime: 10,
        endTime: 16,
        memo: '研修・トレーニング'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  },

  // 夜間担当カテゴリ
  {
    id: 'night-duty',
    name: 'night-duty',
    displayName: '夜間担当',
    description: '18:00-21:00の夜間担当',
    category: 'night-duty',
    schedules: [
      {
        status: 'night duty',
        startTime: 18,
        endTime: 21,
        memo: '夜間担当'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  },
  {
    id: 'night-duty-extended',
    name: 'night-duty-extended',
    displayName: '夜間担当(延長)',
    description: '17:00-21:00の夜間担当(延長)',
    category: 'night-duty',
    schedules: [
      {
        status: 'night duty',
        startTime: 17,
        endTime: 21,
        memo: '夜間担当(延長)'
      }
    ],
    isActive: true,
    customizable: true,
    isDefault: true
  }
];

// プリセットユーティリティ関数
export const getPresetsByCategory = (category: string): UnifiedPreset[] => {
  return DEFAULT_UNIFIED_PRESETS.filter(preset => preset.category === category);
};

export const getActivePresets = (): UnifiedPreset[] => {
  return DEFAULT_UNIFIED_PRESETS.filter(preset => preset.isActive);
};

export const getPresetById = (id: string): UnifiedPreset | undefined => {
  return DEFAULT_UNIFIED_PRESETS.find(preset => preset.id === id);
};

export const getCategoryInfo = (categoryId: string): PresetCategory | undefined => {
  return PRESET_CATEGORIES.find(category => category.id === categoryId);
};

// 既存のPresetSchedule形式に変換するためのユーティリティ
export const convertToLegacyFormat = (preset: UnifiedPreset) => {
  // 最初のスケジュールを基準に変換（月次プランナー・個人ページ互換）
  const schedule = preset.schedules[0];
  return {
    key: preset.id,
    label: preset.displayName,
    status: schedule.status,
    start: schedule.startTime,
    end: schedule.endTime,
    // 複数スケジュールの場合の追加情報
    ...(preset.schedules.length > 1 && {
      id: preset.id,
      name: preset.displayName,
      timeDisplay: `${preset.schedules[0].startTime}:00-${preset.schedules[preset.schedules.length - 1].endTime}:00`,
      schedules: preset.schedules.map(schedule => ({
        status: schedule.status,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        memo: schedule.memo
      }))
    })
  };
};

// デフォルト設定
export const DEFAULT_PRESET_SETTINGS = {
  pagePresetSettings: {
    monthlyPlanner: {
      enabledPresetIds: [
        'standard-work',
        'early-work', 
        'late-work',
        'short-time-work',
        'full-day-off',
        'morning-off',
        'afternoon-off'
      ],
      defaultPresetId: 'standard-work'
    },
    personalPage: {
      enabledPresetIds: [
        'standard-work',
        'remote-work',
        'meeting-block',
        'training',
        'full-day-off',
        'morning-off',
        'afternoon-off',
        'night-duty'
      ],
      defaultPresetId: 'standard-work'
    }
  }
};