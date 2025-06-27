// MainAppConstants.ts - FullMainApp関連の定数定義

import { STATUS_COLORS } from '../timeline/TimelineUtils';

// ステータス色は TimelineUtils.STATUS_COLORS を使用
// 大文字小文字両対応のための拡張マップ
export const statusColors: { [key: string]: string } = {
  ...STATUS_COLORS,
  // 大文字バリエーション（後方互換性）
  'Online': STATUS_COLORS.online,
  'Remote': STATUS_COLORS.remote,
  'Meeting': STATUS_COLORS.meeting,
  'Training': STATUS_COLORS.training,
  'Break': STATUS_COLORS.break,
  'Off': STATUS_COLORS.off,
  'Unplanned': STATUS_COLORS.unplanned,
  'Night duty': STATUS_COLORS['night duty'],
};

// 表示用ステータスカラー（重複除去済み）
export const displayStatusColors: { [key: string]: string } = {
  'online': '#22c55e',
  'remote': '#10b981', 
  'meeting': '#f59e0b',
  'training': '#3b82f6',
  'break': '#f97316',
  'off': '#ef4444',
  'unplanned': '#dc2626',
  'night duty': '#4f46e5',
};

// 部署の色設定（より薄く調整）
export const departmentColors: { [key: string]: string } = {
  "カスタマー・サポートセンター": "#ffebeb",
  "カスタマーサポート部": "#f8f8f8",
  "財務情報第一システムサポート課": "#ffebeb",
  "財務情報第二システムサポート課": "#fcf2f8",
  "税務情報システムサポート課": "#fff6e0",
  "給与計算システムサポート課": "#f0f2f5",
  "ＯＭＳ・テクニカルサポート課": "#f4fff2",
  "一次受付サポート課": "#e3f2fd",
  "ＴＡＳＫカスタマーサポート部": "#f1f7ed",
  "コールセンター業務管理部": "#ebf5fc",
  "総務部": "#e1f5fe",
  "unknown": "#fdfdfd"
};

// グループの色設定（スタッフの背景色として使用、より薄く調整）
export const teamColors: { [key: string]: string } = {
  "カスタマー・サポートセンター": "#f5f5f5",
  "カスタマーサポート部": "#fafafa",
  "財務情報第一システムサポート課": "#fdf6f0",
  "財務会計グループ": "#fffaf6",
  "ＦＸ２グループ": "#fff8f0",
  "ＦＸ２・ＦＸ４クラウドグループ": "#fff4e6",
  "業種別システムグループ": "#fffbf5",
  "財務情報第二システムサポート課": "#fdf4f7",
  "ＦＸクラウドグループ": "#fef7f9",
  "ＳＸ・ＦＭＳグループ": "#fef9fc",
  "税務情報システムサポート課": "#fcf9ed",
  "税務情報第一システムグループ": "#fffded",
  "税務情報第二システムグループ": "#fffef2",
  "給与計算システムサポート課": "#f7f9fc",
  "ＰＸ第一グループ": "#f6f2fc",
  "ＰＸ第二グループ": "#f1ebf7",
  "ＰＸ第三グループ": "#fbf9fe",
  "ＯＭＳ・テクニカルサポート課": "#f6fcf5",
  "ＯＭＳグループ": "#f4ffeb",
  "ハードウェアグループ": "#f2f8ed",
  "一次受付サポート課": "#f5fbff",
  "一次受付グループ": "#f6f9fd",
  "ＴＡＳＫカスタマーサポート部": "#f2f9f2",
  "住民情報・福祉情報システム第一グループ": "#f0f7f0",
  "住民情報・福祉情報システム第二グループ": "#f9fcf9",
  "税務情報システムグループ": "#f5fbf9",
  "住民サービス・内部情報システムサービス": "#f2fbfe",
  "コールセンター業務管理部": "#f8fcfe",
  "総務部": "#ecf9fe",
  "unknown_team": "#fefefe"
};

// 設定ファイルからAPIのURLを取得する関数
export const getApiUrl = (): string => {
  // バックエンドAPIのURLを正しく設定
  if (typeof window !== 'undefined' && window.APP_CONFIG?.API_HOST) {
    return window.APP_CONFIG.API_HOST;
  }
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${currentHost}:3002`;
};

// 利用可能なステータス定義
export const availableStatuses = ['online', 'remote', 'meeting', 'training', 'break', 'off', 'unplanned', 'night duty'];
export const AVAILABLE_STATUSES = ['online', 'remote', 'night duty'];