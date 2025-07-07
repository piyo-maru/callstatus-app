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
    id: 'night-duty',
    name: 'night-duty',
    displayName: '夜間担当',
    description: '夜間・深夜時間帯の勤務',
    color: '#4f46e5',
    icon: '🌙'
  },
  {
    id: 'special',
    name: 'special',
    displayName: 'その他',
    description: '研修、会議など',
    color: '#3b82f6',
    icon: '⭐'
  }
];

// デフォルトプリセット定義（整理済み設定）
export const DEFAULT_UNIFIED_PRESETS: UnifiedPreset[] = [
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
    isActive: true,
    customizable: true,
    isDefault: false
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
    isActive: true,
    customizable: true,
    isDefault: false
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
    isActive: true,
    customizable: true,
    isDefault: false
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
    isActive: true,
    customizable: true,
    isDefault: false
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
    isActive: true,
    customizable: true,
    isDefault: false
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
    isActive: true,
    customizable: true,
    isDefault: false
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
    isActive: true,
    customizable: true,
    isDefault: false
  },
  {
    id: 'custom-1751466327183',
    name: 'substitute-work-regular',
    displayName: '振出（出向社員）',
    description: '振替出勤の勤務',
    category: 'general',
    schedules: [
      { status: '出社', startTime: 9, endTime: 12, memo: '' },
      { status: 'break', startTime: 12, endTime: 13, memo: '' },
      { status: 'online', startTime: 13, endTime: 18, memo: '' }
    ],
    isActive: true,
    customizable: true,
    isDefault: false
  },
  {
    id: 'custom-1751466335072',
    name: 'substitute-work-part-time',
    displayName: '振出（パートタイマー）',
    description: '振替出勤のパートタイム勤務',
    category: 'general',
    schedules: [
      { status: '出社', startTime: 9, endTime: 12, memo: '' },
      { status: 'break', startTime: 12, endTime: 13, memo: '' },
      { status: 'online', startTime: 13, endTime: 17.75, memo: '' }
    ],
    isActive: true,
    customizable: true,
    isDefault: false
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
      { status: 'online', startTime: 12, endTime: 13, memo: '' },
      { status: 'break', startTime: 17, endTime: 18, memo: '' },
      { status: 'night duty', startTime: 18, endTime: 21, memo: '' }
    ],
    representativeScheduleIndex: 3,
    isActive: true,
    customizable: true,
    isDefault: false
  },
  // その他カテゴリ
  {
    id: 'custom-1751379703893',
    name: 'custom-1751379703893',
    displayName: '出張',
    description: '出張業務',
    category: 'special',
    schedules: [
      { status: 'trip', startTime: 9, endTime: 18, memo: '' }
    ],
    isActive: true,
    customizable: true,
    isDefault: false
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
  // 代表色選択を考慮してスケジュールを決定
  const representativeIndex = preset.representativeScheduleIndex ?? 0;  // デフォルトは最初のスケジュール
  const representativeSchedule = preset.schedules[representativeIndex] || preset.schedules[0];
  
  return {
    key: preset.id,
    label: preset.displayName,
    status: representativeSchedule.status,  // 代表スケジュールのステータスを使用
    start: representativeSchedule.startTime,
    end: representativeSchedule.endTime,
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

// デフォルト設定（整理済み設定）
export const DEFAULT_PRESET_SETTINGS = {
  pagePresetSettings: {
    monthlyPlanner: {
      enabledPresetIds: [
        'night-duty',
        'paid-leave',
        'custom-1751459171314',
        'custom-1751459196532',
        'custom-1751466304586',
        'custom-1751466316908'
      ],
      defaultPresetId: 'night-duty',
      presetDisplayOrder: [
        'night-duty',
        'paid-leave',
        'custom-1751459171314',
        'custom-1751459196532',
        'custom-1751466304586',
        'custom-1751466316908'
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
  }
};