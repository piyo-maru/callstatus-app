'use client';

import React, { useState, useEffect, useMemo, useCallback, Fragment, useRef } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthProvider';
// TimelineUtilsをインポート
import {
  timeToPositionPercent,
  positionPercentToTime,
  generateTimeOptions,
  STATUS_COLORS,
  TIMELINE_CONFIG,
  capitalizeStatus,
  getEffectiveStatusColor
} from './timeline/TimelineUtils';
// 祝日関連のインポート
import { Holiday } from './types/MainAppTypes';
import { fetchHolidays, getHoliday, getDateColor, formatDateWithHoliday } from './utils/MainAppUtils';
// 統一プリセットシステム
import { usePresetSettings } from '../hooks/usePresetSettings';
import { UnifiedPreset } from './types/PresetTypes';
import { UnifiedSettingsModal } from './modals/UnifiedSettingsModal';
import { getApiUrl } from './constants/MainAppConstants';

interface Schedule {
  id: number | string;
  status: string;
  start: Date | number;
  end: Date | number;
  memo?: string;
  layer?: 'contract' | 'adjustment';
  staffId: number;
  staffName: string;
  staffDepartment: string;
  staffGroup: string;
  empNo?: string;
  date?: string; // 日付情報追加
}

interface Staff {
  id: number;
  empNo?: string;
  name: string;
  department: string;
  group: string;
  isActive?: boolean;
}

interface PresetSchedule {
  id: string;
  name: string;
  displayName: string; // 表示用の名前
  timeDisplay: string; // 表示用の時間
  schedules: Array<{
    status: string;
    startTime: number;
    endTime: number;
    memo?: string;
  }>;
}

interface PresetButtonProps {
  preset: PresetSchedule;
  targetDate: Date;
  onAdd: (preset: PresetSchedule, date: Date) => void;
  disabled?: boolean;
}

// メイン画面と同じ担当設定データ型定義
type GeneralResponsibilityData = {
  fax: boolean;
  subjectCheck: boolean;
  custom: string;
};

type ReceptionResponsibilityData = {
  lunch: boolean;
  fax: boolean;
  cs: boolean;
  custom: string;
};

type ResponsibilityData = GeneralResponsibilityData | ReceptionResponsibilityData;

// ユーティリティ関数（TimelineUtilsから使用）
const availableStatuses = ['online', 'remote', 'meeting', 'training', 'break', 'off', 'unplanned', 'night duty'];

interface PersonalSchedulePageProps {
  initialStaffId?: number;    // 表示対象のスタッフID（指定なしは本人）
  readOnlyMode?: boolean;     // 閲覧専用モード
}

const PersonalSchedulePage: React.FC<PersonalSchedulePageProps> = ({ 
  initialStaffId, 
  readOnlyMode = false 
}) => {
  const { user, loading: authLoading, logout } = useAuth();
  
  // 統一プリセットシステム
  const { getPresetsForPage } = usePresetSettings();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateForPreset, setSelectedDateForPreset] = useState<Date | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [isResponsibilityModalOpen, setIsResponsibilityModalOpen] = useState(false);
  const [selectedDateForResponsibility, setSelectedDateForResponsibility] = useState<Date | null>(null);
  const [responsibilityData, setResponsibilityData] = useState<{ [key: string]: ResponsibilityData }>({});
  const [isCompactMode, setIsCompactMode] = useState(() => {
    // localStorageから初期値を読み込み
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('personalScheduleCompactMode');
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isUnifiedSettingsOpen, setIsUnifiedSettingsOpen] = useState(false);

  // スクロール位置管理のためのref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // スクロール同期のためのref
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // スクロール同期ハンドラー
  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };
  
  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };
  // スクロール位置保存用（縦・横両対応）
  const [savedScrollPosition, setSavedScrollPosition] = useState({ x: 0, y: 0 });
  
  // スクロール位置キャプチャ関数
  const captureScrollPosition = useCallback(() => {
    const horizontalScroll = bottomScrollRef.current?.scrollLeft || 0;
    const verticalScroll = window.scrollY || document.documentElement.scrollTop || 0;
    
    setSavedScrollPosition({ x: horizontalScroll, y: verticalScroll });
  }, []);
  
  // モーダル関連の状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [draggedSchedule, setDraggedSchedule] = useState<Partial<Schedule> | null>(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState<number | string | null>(null);
  
  // メイン画面と同じ選択・ドラッグ状態管理
  const [selectedSchedule, setSelectedSchedule] = useState<{ schedule: Schedule; layer: string } | null>(null);
  const [dragInfo, setDragInfo] = useState<{
    staff: Staff;
    startX: number;
    currentX: number;
    rowRef: HTMLDivElement;
    day: Date;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0); // ドラッグオフセット（メイン画面と同じ）

  // プリセット予定（統一プリセットシステムから取得）
  const presetSchedules: PresetSchedule[] = useMemo(() => {
    const unifiedPresets = getPresetsForPage('personalPage');
    return unifiedPresets.map(preset => ({
      id: preset.id,
      name: preset.name,
      displayName: preset.displayName,
      timeDisplay: preset.schedules.length === 1 
        ? `${preset.schedules[0].startTime.toString().padStart(2, '0')}:00-${preset.schedules[0].endTime.toString().padStart(2, '0')}:00`
        : `${preset.schedules[0].startTime.toString().padStart(2, '0')}:00-${preset.schedules[preset.schedules.length - 1].endTime.toString().padStart(2, '0')}:00 + 調整`,
      schedules: preset.schedules.map(schedule => ({
        status: schedule.status,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        memo: schedule.memo
      }))
    }));
  }, [getPresetsForPage]);

  // 旧プリセット定義（統一プリセットシステムに移行済み）
  // const presetSchedules: PresetSchedule[] = [
  //   { 
  //     id: 'remote-work', 
  //     name: '在宅勤務', 
  //     displayName: '在宅勤務',
  //     timeDisplay: '09:00-18:00',
  //     schedules: [{ status: 'remote', startTime: 9, endTime: 18 }]
  //   },
  //   { 
  //     id: 'night-duty', 
  //     name: '夜間', 
  //     displayName: '夜間',
  //     timeDisplay: '18:00-21:00 + 調整',
  //     schedules: [
  //       { status: 'night duty', startTime: 18, endTime: 21 },
  //       { status: 'off', startTime: 9, endTime: 13 },
  //       { status: 'break', startTime: 17, endTime: 18 }
  //     ]
  //   },
  //   { 
  //     id: 'vacation', 
  //     name: '休暇', 
  //     displayName: '休暇',
  //     timeDisplay: '09:00-18:00',
  //     schedules: [{ status: 'off', startTime: 9, endTime: 18 }]
  //   },
  //   { 
  //     id: 'morning-off', 
  //     name: '午前休', 
  //     displayName: '午前休',
  //     timeDisplay: '09:00-13:00',
  //     schedules: [{ status: 'off', startTime: 9, endTime: 13 }]
  //   },
  //   { 
  //     id: 'afternoon-off', 
  //     name: '午後休', 
  //     displayName: '午後休',
  //     timeDisplay: '12:00-18:00',
  //     schedules: [{ status: 'off', startTime: 12, endTime: 18 }]
  //   },
  //   { 
  //     id: 'early-leave', 
  //     name: '早退', 
  //     displayName: '早退',
  //     timeDisplay: '12:00-18:00',
  //     schedules: [{ status: 'unplanned', startTime: 12, endTime: 18 }]
  //   }
  // ];

  // 月間の日付リストを生成
  const monthDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // 日付別スケジュールMap（O(1)アクセス用）
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    schedules.forEach(schedule => {
      let dateKey = '';
      if (schedule.date) {
        dateKey = schedule.date;
      } else if (schedule.start instanceof Date) {
        dateKey = format(schedule.start, 'yyyy-MM-dd');
      } else if (typeof schedule.start === 'string') {
        dateKey = format(new Date(schedule.start), 'yyyy-MM-dd');
      }
      
      if (dateKey && !map.has(dateKey)) {
        map.set(dateKey, []);
      }
      if (dateKey) {
        map.get(dateKey)!.push(schedule);
      }
    });
    return map;
  }, [schedules]);

  // 祝日チェック用Map（O(1)アクセス用）
  const holidayByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach(holiday => {
      const dateKey = format(new Date(holiday.date), 'yyyy-MM-dd');
      map.set(dateKey, holiday);
    });
    return map;
  }, [holidays]);

  // TimelineUtilsの関数を使用（既にインポート済み）

  // APIベースURLは統一されたgetApiUrl関数を使用

  // 認証付きfetch
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };

    // FormDataを使用する場合はContent-Typeを設定しない（ブラウザが自動設定）
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // useAuthからのtokenを使用
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 401エラーの場合はログアウト
    if (response.status === 401) {
      logout();
      throw new Error('認証が必要です');
    }

    return response;
  }, [logout]);

  // 権限チェック関数
  const canManage = useCallback(() => {
    return user?.role === 'ADMIN';
  }, [user?.role]);

  // 担当設定データ取得関数
  const fetchResponsibilityData = useCallback(async (dateString: string) => {
    try {
      const response = await authenticatedFetch(`${getApiUrl()}/api/responsibilities?date=${dateString}`);
      if (response.ok) {
        const data = await response.json();
        if (isDebugMode) console.log(`担当設定データ取得 (${dateString}):`, data);
        // APIレスポンスの構造を確認して適切に返す
        if (data.responsibilities && Array.isArray(data.responsibilities)) {
          return data.responsibilities;
        } else if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (error) {
      console.error('担当設定データ取得エラー:', error); // エラーログは保持
    }
    return [];
  }, [authenticatedFetch, getApiUrl]);

  // 担当設定保存関数
  const saveResponsibilityData = useCallback(async (staffId: number, date: string, responsibilityData: ResponsibilityData) => {
    try {
      const response = await authenticatedFetch(`${getApiUrl()}/api/responsibilities`, {
        method: 'POST',
        body: JSON.stringify({
          staffId,
          date,
          responsibilities: responsibilityData
        })
      });
      
      if (response.ok) {
        // 担当設定データを再取得して更新
        const updatedData = await fetchResponsibilityData(date);
        const responsibilityMap: { [key: string]: ResponsibilityData } = {};
        
        // updatedDataが配列かどうかチェック
        if (Array.isArray(updatedData)) {
          if (isDebugMode) console.log('担当設定保存後のデータ更新:', updatedData);
          updatedData.forEach((assignment: any) => {
            const key = `${assignment.staffId}-${date}`;
            console.log(`責任データマップ更新: ${key}`, assignment);
            
            if (!responsibilityMap[key]) {
              // 部署に応じて初期化
              if (currentStaff?.department.includes('受付') || currentStaff?.group.includes('受付')) {
                responsibilityMap[key] = { lunch: false, fax: false, cs: false, custom: '' } as ReceptionResponsibilityData;
              } else {
                responsibilityMap[key] = { fax: false, subjectCheck: false, custom: '' } as GeneralResponsibilityData;
              }
            }
            
            if (assignment.assignmentType === 'fax') responsibilityMap[key].fax = true;
            if (assignment.assignmentType === 'subjectCheck') (responsibilityMap[key] as GeneralResponsibilityData).subjectCheck = true;
            if (assignment.assignmentType === 'lunch') (responsibilityMap[key] as ReceptionResponsibilityData).lunch = true;
            if (assignment.assignmentType === 'cs') (responsibilityMap[key] as ReceptionResponsibilityData).cs = true;
            if (assignment.assignmentType === 'custom') responsibilityMap[key].custom = assignment.customLabel || '';
          });
          
          console.log('保存後のresponsibilityMap:', responsibilityMap);
          setResponsibilityData(prev => {
            const newData = { ...prev, ...responsibilityMap };
            console.log('responsibilityData ステート更新:', newData);
            return newData;
          });
        } else {
          console.log('担当設定の更新データが配列ではありません:', updatedData);
        }
        return true;
      }
    } catch (error) {
      console.error('担当設定保存エラー:', error); // エラーログは保持
    }
    return false;
  }, [authenticatedFetch, getApiUrl, fetchResponsibilityData, currentStaff]);

  // 現在のユーザーの社員情報を取得
  const fetchCurrentStaff = useCallback(async () => {
    if (!user?.email) {
      console.error('ユーザー情報が取得できません');
      return;
    }

    try {
      if (isDev) {
        console.log('API URL:', getApiUrl());
        console.log('ユーザーメール:', user.email);
      }
      
      const response = await authenticatedFetch(`${getApiUrl()}/api/staff`);
      if (isDev) console.log('スタッフAPI レスポンス状態:', response.status);
      
      if (response.ok) {
        const staffList: Staff[] = await response.json();
        if (isDev) console.log('取得したスタッフリスト:', staffList);
        
        let targetStaff: Staff | undefined;
        
        // initialStaffIdが指定されている場合は、指定されたスタッフを表示
        if (initialStaffId) {
          targetStaff = staffList.find(staff => staff.id === initialStaffId);
          if (isDev) console.log(`指定されたスタッフID: ${initialStaffId}, 見つかったスタッフ:`, targetStaff);
        } else {
          // initialStaffIdが指定されていない場合は、ログインユーザーに対応する社員を表示
          targetStaff = staffList.find(staff => {
            // Contract テーブルのemailとマッチング
            return staff.name.includes(user.email.split('@')[0]) || 
                   staff.empNo === user.email.split('@')[0];
          });
          
          if (!targetStaff && staffList.length > 0) {
            if (isDev) console.log('ユーザーに対応する社員が見つからないため、最初の社員を使用');
            targetStaff = staffList[0];
          }
        }
        
        if (targetStaff) {
          if (isDev) console.log('選択された社員:', targetStaff);
          setCurrentStaff(targetStaff);
          
          // 契約データを取得
          try {
            const contractResponse = await authenticatedFetch(`${getApiUrl()}/api/contracts/staff/${targetStaff.id}`);
            if (contractResponse.ok) {
              const contract = await contractResponse.json();
              if (isDev) console.log('取得した契約データ:', contract);
              setContractData(contract);
            } else {
              if (isDev) console.log('契約データが見つかりません');
              setContractData(null);
            }
          } catch (err) {
            console.error('契約データの取得に失敗:', err);
            setContractData(null);
          }
        } else {
          if (initialStaffId) {
            setError(`指定されたスタッフ（ID: ${initialStaffId}）が見つかりません`);
          } else {
            setError('対応する社員情報が見つかりません');
          }
        }
      } else {
        const errorText = await response.text();
        console.error('スタッフAPI エラー:', response.status, errorText); // エラーログは保持
        setError(`社員情報の取得に失敗しました: ${response.status}`);
      }
    } catch (err) {
      console.error('社員情報の取得に失敗:', err); // エラーログは保持
      setError('社員情報の取得中にエラーが発生しました');
    }
  }, [user, getApiUrl, authenticatedFetch]);

  // スクロール位置復元関数（縦・横両対応）
  const restoreScrollPosition = useCallback(() => {
    const restoreScroll = () => {
      if (topScrollRef.current && bottomScrollRef.current) {
        // 横スクロール復元（2つの要素を同期）
        if (savedScrollPosition.x > 0) {
          topScrollRef.current.scrollLeft = savedScrollPosition.x;
          bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
        }
        
        // 縦スクロール復元
        if (savedScrollPosition.y >= 0) {
          window.scrollTo(0, savedScrollPosition.y);
        }
      }
    };
    
    // 複数回復元を試行（DOM更新タイミングの違いに対応）
    setTimeout(restoreScroll, 50);
    setTimeout(restoreScroll, 200);
    setTimeout(restoreScroll, 500);
  }, [savedScrollPosition]);

  // 開発環境でのみデバッグログを出力する制御
  // デバッグモードを有効にするにはブラウザコンソールで: window.DEBUG_PERSONAL_SCHEDULE = true
  const isDev = process.env.NODE_ENV === 'development';
  const isDebugMode = isDev && (typeof window !== 'undefined' && (window as any).DEBUG_PERSONAL_SCHEDULE);

  // ヘックス色をRGBに変換するユーティリティ関数
  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }, []);

  // 色を藄くする関数（白とブレンド）
  const lightenColor = useCallback((color: string, amount: number = 0.7): string => {
    const rgb = hexToRgb(color);
    if (!rgb) return color;

    // 白とブレンドして薄くする
    const r = Math.round(rgb.r + (255 - rgb.r) * amount);
    const g = Math.round(rgb.g + (255 - rgb.g) * amount);
    const b = Math.round(rgb.b + (255 - rgb.b) * amount);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, [hexToRgb]);

  // 色を暗くする関数（ボーダー用）
  const darkenColor = useCallback((color: string, amount: number = 0.2): string => {
    const rgb = hexToRgb(color);
    if (!rgb) return color;

    const r = Math.round(rgb.r * (1 - amount));
    const g = Math.round(rgb.g * (1 - amount));
    const b = Math.round(rgb.b * (1 - amount));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, [hexToRgb]);

  // WCAG標準に基づいた相対輝度計算
  const getRelativeLuminance = useCallback((rgb: {r: number; g: number; b: number}): number => {
    // 各色成分をsRGBから線形RGBに変換
    const toLinear = (value: number): number => {
      const normalized = value / 255;
      return normalized <= 0.03928 
        ? normalized / 12.92 
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };

    const r = toLinear(rgb.r);
    const g = toLinear(rgb.g);
    const b = toLinear(rgb.b);

    // WCAG標準の相対輝度計算式
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }, []);

  // コントラスト比を計算
  const getContrastRatio = useCallback((color1: {r: number; g: number; b: number}, color2: {r: number; g: number; b: number}): number => {
    const lum1 = getRelativeLuminance(color1);
    const lum2 = getRelativeLuminance(color2);
    
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }, [getRelativeLuminance]);

  // RGBをHSLに変換
  const rgbToHsl = useCallback((rgb: {r: number; g: number; b: number}) => {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }, []);

  // HSLをRGBに変換
  const hslToRgb = useCallback((h: number, s: number, l: number) => {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    if (s === 0) {
      const gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray };
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

    return { r, g, b };
  }, []);

  // 色相ベースで調和したテキスト色を生成
  const getHueBasedTextColor = useCallback((backgroundColor: string): string => {
    const bgRgb = hexToRgb(backgroundColor);
    
    if (!bgRgb) {
      return '#000000';
    }

    const bgHsl = rgbToHsl(bgRgb);
    const bgLuminance = getRelativeLuminance(bgRgb);
    
    // 背景の明度に基づいてベースとなる色を決定
    const isDarkBackground = bgLuminance < 0.5;
    
    // 色相ベースのテキスト色候補を生成
    const candidates = [];
    
    if (isDarkBackground) {
      // 暗い背景の場合：明るい色をベースに
      // 同系統の明るい色（彩度を下げて柔らかく）
      candidates.push({
        color: hslToRgb(bgHsl.h, Math.max(20, bgHsl.s * 0.3), 85),
        name: 'harmonious-light'
      });
      
      // 補色の明るい色（アクセント効果）
      candidates.push({
        color: hslToRgb((bgHsl.h + 180) % 360, Math.max(30, bgHsl.s * 0.5), 90),
        name: 'complementary-light'
      });
      
      // 純白とオフホワイト
      candidates.push({ color: { r: 255, g: 255, b: 255 }, name: 'white' });
      candidates.push({ color: { r: 248, g: 250, b: 252 }, name: 'off-white' });
      
    } else {
      // 明るい背景の場合：暗い色をベースに
      // 同系統の暗い色（彩度を高めて鮮やかに）
      candidates.push({
        color: hslToRgb(bgHsl.h, Math.min(80, Math.max(40, bgHsl.s * 1.2)), 25),
        name: 'harmonious-dark'
      });
      
      // 補色の暗い色
      candidates.push({
        color: hslToRgb((bgHsl.h + 180) % 360, Math.min(70, Math.max(35, bgHsl.s * 0.8)), 30),
        name: 'complementary-dark'
      });
      
      // チャコール系
      candidates.push({ color: { r: 31, g: 41, b: 55 }, name: 'charcoal' });  // #1f2937
      candidates.push({ color: { r: 17, g: 24, b: 39 }, name: 'dark-blue' }); // #111827
    }
    
    // 各候補色とのコントラスト比を計算
    const contrastResults = candidates.map(candidate => {
      const contrast = getContrastRatio(bgRgb, candidate.color);
      return {
        ...candidate,
        contrast,
        hex: `#${candidate.color.r.toString(16).padStart(2, '0')}${candidate.color.g.toString(16).padStart(2, '0')}${candidate.color.b.toString(16).padStart(2, '0')}`
      };
    });
    
    // WCAG AAレベルを満たす色を優先選択
    const minContrast = 4.5;
    const validCandidates = contrastResults.filter(c => c.contrast >= minContrast);
    
    if (validCandidates.length > 0) {
      // 調和系の色を優先し、次にコントラストの高い色を選択
      const harmoniousCandidates = validCandidates.filter(c => c.name.includes('harmonious'));
      if (harmoniousCandidates.length > 0) {
        return harmoniousCandidates.sort((a, b) => b.contrast - a.contrast)[0].hex;
      }
      
      // 調和系がない場合は最高コントラストを選択
      return validCandidates.sort((a, b) => b.contrast - a.contrast)[0].hex;
    }
    
    // 最低でも最高コントラストを選択
    const bestCandidate = contrastResults.sort((a, b) => b.contrast - a.contrast)[0];
    return bestCandidate.hex;
    
  }, [hexToRgb, rgbToHsl, hslToRgb, getRelativeLuminance, getContrastRatio]);

  // スケジュールデータを取得
  const fetchSchedules = useCallback(async () => {
    if (!currentStaff) {
      if (isDev) console.log('currentStaffが設定されていないため、スケジュール取得をスキップ');
      return;
    }

    if (isDev) {
      console.log('スケジュール取得開始:', {
        currentStaff: currentStaff.name,
        staffId: currentStaff.id,
        monthDays: monthDays.length
      });
    }

    setLoading(true);
    setError(null);

    try {
      const promises = monthDays.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const url = `${getApiUrl()}/api/schedules/unified?date=${dateStr}&includeMasking=false`;
        if (isDebugMode) console.log(`API呼び出し: ${url}`);
        
        const response = await authenticatedFetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (isDebugMode) console.log(`${dateStr}のレスポンス:`, data);
          
          const filteredSchedules = data.schedules?.filter((schedule: Schedule) => 
            schedule.staffId === currentStaff.id
          ) || [];
          
          // 取得したスケジュールに日付情報を追加
          const schedulesWithDate = filteredSchedules.map((schedule: any) => ({
            ...schedule,
            date: dateStr, // 取得日付を明示的に設定
            start: typeof schedule.start === 'number' ? schedule.start : new Date(schedule.start),
            end: typeof schedule.end === 'number' ? schedule.end : new Date(schedule.end)
          }));
          
          return schedulesWithDate;
        } else {
          console.error(`${dateStr}のAPI呼び出し失敗:`, response.status);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const allSchedules = results.flat();
      if (isDev) console.log('全スケジュール取得完了:', allSchedules.length, '件');
      
      setSchedules(allSchedules);
      
      // スクロール位置復元
      restoreScrollPosition();
    } catch (err) {
      console.error('スケジュールの取得に失敗:', err);
      setError('スケジュールの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentStaff, monthDays, getApiUrl, authenticatedFetch, restoreScrollPosition]);

  // 祝日データを初期化
  useEffect(() => {
    fetchHolidays().then(setHolidays);
  }, []);

  // 初期化処理
  useEffect(() => {
    if (!authLoading && user) {
      fetchCurrentStaff();
    }
  }, [authLoading, user, fetchCurrentStaff]);

  // 担当設定データ読み込み（メイン画面と同じ方式）
  const loadResponsibilityData = useCallback(async () => {
    if (!currentStaff) return;
    
    if (isDev) {
      console.log('担当設定データ読み込み開始（メイン画面方式）:', {
        staffId: currentStaff.id,
        staffName: currentStaff.name,
        monthDaysCount: monthDays.length
      });
    }
    
    const responsibilityMap: { [key: string]: ResponsibilityData } = {};
    
    // 選択月の各日の担当設定を取得（メイン画面と同じAPI構造）
    for (const day of monthDays) {
      const dateString = format(day, 'yyyy-MM-dd');
      
      try {
        const response = await authenticatedFetch(`${getApiUrl()}/api/responsibilities?date=${dateString}`);
        if (response.ok) {
          const data = await response.json();
          if (isDebugMode) console.log(`${dateString}の担当設定データ（メイン画面形式）:`, data);
          
          // メイン画面と同じ構造: {responsibilities: [...]}
          if (data.responsibilities && Array.isArray(data.responsibilities)) {
            data.responsibilities.forEach((responsibilityInfo: any) => {
              if (responsibilityInfo.staffId === currentStaff.id && responsibilityInfo.responsibilities) {
                const key = `${responsibilityInfo.staffId}-${dateString}`;
                if (isDebugMode) console.log(`担当設定マップ追加（メイン画面方式）: ${key}`, responsibilityInfo.responsibilities);
                
                // メイン画面と同じように、responsibilityInfo.responsibilitiesを直接使用
                responsibilityMap[key] = responsibilityInfo.responsibilities;
              }
            });
          }
        } else {
          console.warn(`担当設定API失敗 (${dateString}):`, response.status);
        }
      } catch (error) {
        console.error(`担当設定データ取得エラー (${dateString}):`, error);
      }
    }
    
    console.log('担当設定データ読み込み完了（メイン画面方式）:', {
      mapKeys: Object.keys(responsibilityMap),
      mapData: responsibilityMap
    });
    
    setResponsibilityData(responsibilityMap);
  }, [currentStaff, monthDays, authenticatedFetch, getApiUrl]);

  useEffect(() => {
    if (currentStaff) {
      fetchSchedules();
      // 担当設定データも取得
      loadResponsibilityData();
    }
  }, [currentStaff, fetchSchedules, loadResponsibilityData]);

  // スケジュール更新関数（移動用）
  const handleUpdateSchedule = useCallback(async (scheduleId: number | string, updateData: any) => {
    try {
      console.log('スケジュール更新開始:', { scheduleId, updateData });
      
      const response = await authenticatedFetch(`${getApiUrl()}/api/schedules/${scheduleId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        console.log('スケジュール更新成功');
        // データを再取得して更新
        await fetchSchedules();
        // スクロール位置を復元
        restoreScrollPosition();
      } else {
        console.error('スケジュール更新失敗:', response.status);
        const errorData = await response.json().catch(() => ({}));
        setError(`スケジュールの更新に失敗しました: ${errorData.message || ''}`);
      }
    } catch (error) {
      console.error('スケジュール更新エラー:', error);
      setError('スケジュールの更新に失敗しました');
    }
  }, [authenticatedFetch, getApiUrl, fetchSchedules, restoreScrollPosition]);

  // ドロップハンドラー（メイン画面と同じ）
  const handleDrop = useCallback((e: React.DragEvent, day: Date) => {
    try {
      const scheduleData = JSON.parse(e.dataTransfer.getData('application/json'));
      console.log('ドロップされたスケジュール:', scheduleData);
      
      // ドロップ位置から時刻を計算
      const rect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - rect.left - dragOffset;
      const dropPercent = (dropX / rect.width) * 100;
      const dropTime = positionPercentToTime(Math.max(0, Math.min(100, dropPercent)));
      
      // スケジュールの長さを保持
      const originalStart = typeof scheduleData.start === 'number' ? scheduleData.start : 0;
      const originalEnd = typeof scheduleData.end === 'number' ? scheduleData.end : 0;
      const duration = originalEnd - originalStart;
      
      const snappedStart = Math.round(dropTime * 4) / 4; // 15分単位
      const snappedEnd = Math.round((dropTime + duration) * 4) / 4;
      
      console.log('移動計算:', {
        original: `${originalStart}-${originalEnd}`,
        drop: `${dropTime}`,
        new: `${snappedStart}-${snappedEnd}`,
        duration
      });
      
      if (snappedStart >= 8 && snappedEnd <= 21 && snappedStart < snappedEnd) {
        // API呼び出しで更新
        handleUpdateSchedule(scheduleData.id, {
          ...scheduleData,
          start: snappedStart,
          end: snappedEnd,
          date: format(day, 'yyyy-MM-dd')
        });
      } else {
        console.log('ドロップ位置が無効:', { snappedStart, snappedEnd });
      }
    } catch (error) {
      console.error('ドロップ処理エラー:', error);
    }
  }, [dragOffset, handleUpdateSchedule]);

  // 担当設定バッジ生成（月次プランナーと同じデザイン）
  const generateResponsibilityBadges = useCallback((date: Date): JSX.Element[] => {
    if (!currentStaff) return [];
    
    const dateString = format(date, 'yyyy-MM-dd');
    const key = `${currentStaff.id}-${dateString}`;
    const responsibility = responsibilityData[key];
    
    // バッジ生成ログを削除（高頻度実行でパフォーマンスに影響）
    if (isDebugMode) {
      console.log('バッジ生成チェック:', {
        date: dateString,
        staffId: currentStaff.id,
        key
      });
    }
    
    if (!responsibility) return [];
    
    const badges: JSX.Element[] = [];
    
    // 受付部署の場合
    if ('lunch' in responsibility) {
      const receptionResp = responsibility as ReceptionResponsibilityData;
      if (receptionResp.lunch) badges.push(<span key="lunch" className="bg-blue-500 text-white px-1 py-0 rounded text-[10px] font-bold">昼</span>);
      if (receptionResp.fax) badges.push(<span key="fax" className="bg-green-500 text-white px-1 py-0 rounded text-[10px] font-bold">FAX</span>);
      if (receptionResp.cs) badges.push(<span key="cs" className="bg-purple-500 text-white px-1 py-0 rounded text-[10px] font-bold">CS</span>);
      if (receptionResp.custom) badges.push(<span key="custom" className="bg-gray-500 text-white px-1 py-0 rounded text-[10px] font-bold">{receptionResp.custom.substring(0, 3)}</span>);
    } else {
      // 一般部署の場合
      const generalResp = responsibility as GeneralResponsibilityData;
      if (generalResp.fax) badges.push(<span key="fax" className="bg-green-500 text-white px-1 py-0 rounded text-[10px] font-bold">FAX</span>);
      if (generalResp.subjectCheck) badges.push(<span key="subject" className="bg-orange-500 text-white px-1 py-0 rounded text-[10px] font-bold">件名</span>);
      if (generalResp.custom) badges.push(<span key="custom" className="bg-gray-500 text-white px-1 py-0 rounded text-[10px] font-bold">{generalResp.custom.substring(0, 3)}</span>);
    }
    
    return badges;
  }, [currentStaff, responsibilityData]);

  // プリセット予定を追加（複数スケジュール対応）
  const addPresetSchedule = useCallback(async (preset: PresetSchedule, targetDate: Date) => {
    if (!currentStaff) {
      console.error('社員情報が設定されていません');
      setError('社員情報が設定されていません');
      return;
    }

    const dateStr = format(targetDate, 'yyyy-MM-dd');
    if (isDev) {
      console.log('プリセット予定追加:', {
        preset: preset.name,
        targetDate: dateStr,
        currentStaff: currentStaff.name,
        schedulesCount: preset.schedules.length
      });
    }
    
    try {
      const url = `${getApiUrl()}/api/schedules`;
      
      // 複数のスケジュールを順次作成
      for (const schedule of preset.schedules) {
        const newSchedule = {
          staffId: currentStaff.id,
          status: schedule.status,
          start: schedule.startTime,
          end: schedule.endTime,
          memo: schedule.memo || '',
          date: dateStr,
        };

        if (isDebugMode) console.log('送信データ:', newSchedule);

        const response = await authenticatedFetch(url, {
          method: 'POST',
          body: JSON.stringify(newSchedule),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('追加エラー:', errorData);
          setError(`${preset.name}の追加に失敗しました: ${errorData.message || ''}`);
          return;
        }

        const result = await response.json();
        if (isDev) console.log('追加成功:', result);
      }
      
      // 全スケジュール追加後にデータを再取得
      await fetchSchedules();
      // スクロール位置を復元
      restoreScrollPosition();
      
      // 成功メッセージ
      setError(null);
      if (isDev) console.log(`${preset.name}を追加しました（${preset.schedules.length}件）`);
      
    } catch (err) {
      console.error('スケジュール追加エラー:', err); // エラーログは保持
      setError(`${preset.name}の追加に失敗しました`);
    }
  }, [currentStaff, getApiUrl, authenticatedFetch, fetchSchedules, restoreScrollPosition]);

  // スケジュール保存ハンドラー（メイン画面と同じ）
  const handleSaveSchedule = useCallback(async (scheduleData: Schedule & { id?: number | string; date?: string }) => {
    if (isDev) console.log('スケジュール保存:', scheduleData);
    
    try {
      const isEditing = scheduleData.id !== undefined;
      
      if (isEditing) {
        // 編集の場合 - string IDの場合は新規作成として処理
        if (typeof scheduleData.id === 'string') {
          // 統合APIから来たstring IDは編集不可なので新規作成
          const createData = {
            staffId: scheduleData.staffId || currentStaff?.id,
            status: scheduleData.status,
            start: scheduleData.start,
            end: scheduleData.end,
            memo: scheduleData.memo || '',
            date: scheduleData.date || format(new Date(), 'yyyy-MM-dd'),
          };
          
          const response = await authenticatedFetch(`${getApiUrl()}/api/schedules`, {
            method: 'POST',
            body: JSON.stringify(createData),
          });
          
          if (response.ok) {
            if (isDev) console.log('スケジュール作成成功');
                await fetchSchedules();
            // スクロール位置を復元
            restoreScrollPosition();
            setIsModalOpen(false);
            setEditingSchedule(null);
          } else {
            const errorData = await response.json();
            setError(errorData.message || 'スケジュールの作成に失敗しました');
          }
        } else {
          // 数値IDの場合は通常の編集
          const updateData = {
            status: scheduleData.status,
            start: scheduleData.start,
            end: scheduleData.end,
            memo: scheduleData.memo || '',
          };
          
          const response = await authenticatedFetch(`${getApiUrl()}/api/schedules/${scheduleData.id}`, {
            method: 'PATCH',
            body: JSON.stringify(updateData),
          });
          
          if (response.ok) {
            if (isDev) console.log('スケジュール更新成功');
                await fetchSchedules();
            // スクロール位置を復元
            restoreScrollPosition();
            setIsModalOpen(false);
            setEditingSchedule(null);
          } else {
            const errorData = await response.json();
            setError(errorData.message || 'スケジュールの更新に失敗しました');
          }
        }
      } else {
        // 新規作成の場合
        const createData = {
          staffId: scheduleData.staffId || currentStaff?.id,
          status: scheduleData.status,
          start: scheduleData.start,
          end: scheduleData.end,
          memo: scheduleData.memo || '',
          date: scheduleData.date || format(new Date(), 'yyyy-MM-dd'),
        };
        
        const response = await authenticatedFetch(`${getApiUrl()}/api/schedules`, {
          method: 'POST',
          body: JSON.stringify(createData),
        });
        
        if (response.ok) {
          if (isDev) console.log('スケジュール作成成功');
            await fetchSchedules();
          // スクロール位置を復元
          restoreScrollPosition();
          setIsModalOpen(false);
          setDraggedSchedule(null);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'スケジュールの作成に失敗しました');
        }
      }
    } catch (err) {
      console.error('スケジュール保存エラー:', err); // エラーログは保持
      setError('スケジュールの保存中にエラーが発生しました');
    }
  }, [currentStaff, getApiUrl, authenticatedFetch, fetchSchedules, restoreScrollPosition]);

  // スケジュール削除ハンドラー
  const handleDeleteSchedule = useCallback(async (scheduleId: number | string) => {
    if (isDev) console.log('スケジュール削除:', scheduleId, typeof scheduleId);
    
    try {
      let actualId: number;
      
      if (typeof scheduleId === 'string') {
        // 統合API形式のIDから実際のIDを抽出
        // 形式: adjustment_{adj|sch}_{実際のID}_{配列インデックス}
        const parts = scheduleId.split('_');
        if (parts.length >= 3) {
          actualId = parseInt(parts[2], 10);
          if (isDebugMode) console.log('統合ID形式から数値ID抽出:', scheduleId, '->', actualId);
        } else {
          console.error('統合ID形式から数値IDを抽出できません:', scheduleId);
          setError('削除対象の予定IDが不正です');
          return;
        }
      } else {
        actualId = scheduleId;
      }
      
      const response = await authenticatedFetch(`${getApiUrl()}/api/schedules/${actualId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        if (isDev) console.log('スケジュール削除成功');
        await fetchSchedules();
        // スクロール位置を復元
        restoreScrollPosition();
        setDeletingScheduleId(null);
        setSelectedSchedule(null); // 選択解除
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'スケジュールの削除に失敗しました');
      }
    } catch (err) {
      console.error('スケジュール削除エラー:', err); // エラーログは保持
      setError('スケジュールの削除中にエラーが発生しました');
    }
  }, [getApiUrl, authenticatedFetch, fetchSchedules, restoreScrollPosition]);

  // 月変更ハンドラー
  const handleMonthChange = useCallback((direction: 'prev' | 'next') => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  // コンパクトモード切替処理
  const handleCompactModeToggle = () => {
    const newMode = !isCompactMode;
    setIsCompactMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('personalScheduleCompactMode', JSON.stringify(newMode));
    }
  };

  // 担当設定保存処理
  const handleResponsibilitySave = async (data: ResponsibilityData) => {
    if (!currentStaff || !selectedDateForResponsibility) {
      alert('担当設定の保存に必要な情報が不足しています');
      return;
    }

    try {
      const dateString = format(selectedDateForResponsibility, 'yyyy-MM-dd');
      console.log('担当設定保存:', {
        staff: currentStaff.name,
        date: dateString,
        data
      });
      
      const success = await saveResponsibilityData(currentStaff.id, dateString, data);
      
      if (success) {
        alert(`担当設定を保存しました:\nFAX対応: ${data.fax ? 'あり' : 'なし'}\n件名チェック: ${('subjectCheck' in data) ? (data.subjectCheck ? 'あり' : 'なし') : 'N/A'}\nその他: ${data.custom || 'なし'}`);
        
        // モーダルを閉じる
        setIsResponsibilityModalOpen(false);
        setSelectedDateForResponsibility(null);
        
        // 担当設定データを再読み込みしてバッジを更新
        await loadResponsibilityData();
      } else {
        alert('担当設定の保存に失敗しました');
      }
      
    } catch (error) {
      console.error('担当設定の保存に失敗:', error);
      alert('担当設定の保存に失敗しました');
    }
  };

  // ステータス色の取得
  const getStatusColor = useCallback((status: string): string => {
    const colors: { [key: string]: string } = {
      'online': '#22c55e',
      'remote': '#3b82f6',
      'meeting': '#f59e0b',
      'training': '#8b5cf6',
      'break': '#ef4444',
      'off': '#6b7280',
      'unplanned': '#f97316',
      'night duty': '#1f2937',
    };
    return colors[status] || '#6b7280';
  }, []);

  // 時刻文字列の変換
  const formatTime = useCallback((decimalTime: number): string => {
    const hours = Math.floor(decimalTime);
    const minutes = Math.round((decimalTime - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);

  // タイムライン上でのドラッグ開始処理
  const handleTimelineMouseDown = useCallback((e: React.MouseEvent, day: Date) => {
    if (!currentStaff) return;
    
    // スケジュール要素のonMouseDownで既にstopPropagation()されているので
    // ここに到達するのは空の領域または契約レイヤーの背景をクリックした場合のみ
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    
    if (isDebugMode) {
      console.log('=== タイムラインドラッグ開始 ===');
      console.log('day:', format(day, 'yyyy-MM-dd'));
      console.log('startX:', startX);
      console.log('currentStaff:', currentStaff?.name);
    }
    
    setDragInfo({ 
      staff: currentStaff, 
      startX, 
      currentX: startX, 
      rowRef: e.currentTarget as HTMLDivElement,
      day 
    });
  }, [currentStaff]);

  // ドラッグ処理（メイン画面と同じ）
  useEffect(() => {
    if (!dragInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = dragInfo.rowRef.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      setDragInfo(prev => prev ? { ...prev, currentX } : null);
    };

    const handleMouseUp = () => {
      if (!dragInfo) {
        return;
      }

      const dragDistance = Math.abs(dragInfo.startX - dragInfo.currentX);
      if (isDebugMode) console.log('ドラッグ終了:', { dragDistance });

      if (dragDistance < 10) {
        if (isDebugMode) console.log('ドラッグ距離不足、キャンセル');
        setDragInfo(null);
        return; // 10px未満の移動は無効化
      }

      // ドラッグ範囲を時刻に変換（15分単位にスナップ）
      const rowWidth = dragInfo.rowRef.offsetWidth;
      const startPercent = (Math.min(dragInfo.startX, dragInfo.currentX) / rowWidth) * 100;
      const endPercent = (Math.max(dragInfo.startX, dragInfo.currentX) / rowWidth) * 100;
      const start = positionPercentToTime(startPercent);
      const end = positionPercentToTime(endPercent);
      const snappedStart = Math.round(start * 4) / 4; // 15分単位
      const snappedEnd = Math.round(end * 4) / 4;

      if (isDebugMode) console.log('時刻変換:', { start, end, snappedStart, snappedEnd });

      if (snappedStart < snappedEnd && snappedStart >= 8 && snappedEnd <= 21) {
        // 新規予定作成
        if (isDebugMode) {
          console.log('=== 予定作成モーダルを開く ===');
          console.log('作成する予定:', {
            staffId: dragInfo.staff.id,
            staffName: dragInfo.staff.name,
            status: 'online',
            start: snappedStart,
            end: snappedEnd,
            date: format(dragInfo.day, 'yyyy-MM-dd')
          });
        }
        // 予定作成モーダルを開く前にスクロール位置をキャプチャ
        captureScrollPosition();
        setDraggedSchedule({
          staffId: dragInfo.staff.id,
          status: 'online',
          start: snappedStart,
          end: snappedEnd,
          date: format(dragInfo.day, 'yyyy-MM-dd')
        });
        setIsModalOpen(true);
      } else {
        if (isDebugMode) {
          console.log('=== 時刻範囲が無効 ===');
          console.log('無効な範囲:', { snappedStart, snappedEnd, valid_range: '8-21' });
        }
      }
      setDragInfo(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo]);

  // メイン画面と同じスケジュールクリック処理
  const handleScheduleClick = useCallback((schedule: Schedule, scheduleLayer: string, scheduleDate: Date) => {
    if (schedule.layer === 'contract') return; // 契約レイヤーは編集不可
    
    // 過去の日付は編集不可
    const isPastDate = scheduleDate < new Date(new Date().setHours(0, 0, 0, 0));
    if (isPastDate) return;
    
    const currentSelection = selectedSchedule;
    if (currentSelection && 
        currentSelection.schedule.id === schedule.id && 
        currentSelection.layer === scheduleLayer) {
      // 同じ予定を再クリック → 編集モーダルを開く前にスクロール位置をキャプチャ
      captureScrollPosition();
      setEditingSchedule(schedule);
      setDraggedSchedule(null);
      setIsModalOpen(true);
      setSelectedSchedule(null);
    } else {
      // 異なる予定をクリック → 選択状態にする
      setSelectedSchedule({ schedule, layer: scheduleLayer });
    }
  }, [selectedSchedule]);

  // キーボード操作（削除）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedSchedule) {
        const schedule = selectedSchedule.schedule;
        if (schedule.layer !== 'contract') {
          console.log('Deleteキー削除:', { id: schedule.id, type: typeof schedule.id });
          setDeletingScheduleId(schedule.id);
        }
      }
      if (e.key === 'Escape') {
        setSelectedSchedule(null);
        setDraggedSchedule(null);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedSchedule]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">ログインが必要です</div>
      </div>
    );
  }

  if (!currentStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">社員情報が見つかりません</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-none mx-auto">
        {/* ヘッダー（メイン画面風） */}
        <div className="bg-white rounded-lg shadow-sm mb-4">
          {/* タイトル行 */}
          <div className="px-6 py-3 border-b flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900">個人ページ</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.name || user?.email} ({user?.role === 'ADMIN' ? '管理者' : '一般ユーザー'})
              </span>
              <a
                href="/"
                className="text-sm bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded border border-green-300 transition-colors"
              >
                📊 出社状況
              </a>
              <a
                href="/monthly-planner"
                className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1 rounded border border-purple-300 transition-colors"
              >
                📅 月次プランナー
              </a>
              <button
                onClick={logout}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded border"
              >
                ログアウト
              </button>
            </div>
          </div>
          
          {/* ナビゲーション行 */}
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button 
                  type="button" 
                  onClick={() => handleMonthChange('prev')} 
                  className="px-2 py-1 text-xs font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 h-7"
                >
                  &lt;
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedDate(new Date())} 
                  className="px-2 py-1 text-xs font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100 h-7"
                >
                  今月
                </button>
                <button 
                  type="button" 
                  onClick={() => handleMonthChange('next')} 
                  className="px-2 py-1 text-xs font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100 h-7"
                >
                  &gt;
                </button>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {format(selectedDate, 'yyyy年M月', { locale: ja })}
              </h2>
            </div>
            
            {/* 表示切替トグルボタンと設定ボタン */}
            <div className="flex items-center space-x-3">
              {canManage() && (
                <button
                  onClick={() => setIsUnifiedSettingsOpen(true)}
                  className="px-3 py-1 text-xs font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 h-7"
                >
                  ⚙️ 設定
                </button>
              )}
              <div className="flex items-center space-x-2">
                <span className={`text-xs ${!isCompactMode ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  標準
                </span>
                <button
                  onClick={handleCompactModeToggle}
                  className={`toggle-switch ${isCompactMode ? 'active' : ''}`}
                  type="button"
                >
                  <div className={`toggle-thumb ${isCompactMode ? 'active' : ''}`}></div>
                </button>
                <span className={`text-xs ${isCompactMode ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  コンパクト
                </span>
              </div>
            </div>
          </div>
          
          {/* 個人情報行 */}
          <div className="px-6 py-3 bg-gray-50 border-t">
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <div className="space-y-3">
                <div className="flex items-center space-x-6">
                  <span><span className="text-sm text-gray-600"><strong>名前:</strong></span> <span className="text-base text-blue-800">{currentStaff.name}</span></span>
                  <span><span className="text-sm text-gray-600"><strong>社員番号:</strong></span> <span className="text-base text-blue-800">{currentStaff.empNo || 'N/A'}</span></span>
                  <span><span className="text-sm text-gray-600"><strong>部署:</strong></span> <span className="text-base text-blue-800">{currentStaff.department}</span></span>
                  <span><span className="text-sm text-gray-600"><strong>グループ:</strong></span> <span className="text-base text-blue-800">{currentStaff.group}</span></span>
                </div>
                <div>
                  <span className="text-sm text-gray-600"><strong>契約勤務時間:</strong></span> 
                  <span className="ml-2 text-blue-800 text-sm">
                    {contractData ? (
                      ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'].map((day, index) => {
                        const dayKeys = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
                        const hours = contractData[dayKeys[index]];
                        return hours ? `${day}: ${hours}` : null;
                      }).filter(Boolean).join('　')
                    ) : (
                      '契約データがありません'
                    )}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    ※ 祝日は赤字で表示されます。祝日の勤務時間は個別に調整してください。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* プリセット予定ボタン */}
        <div className="sticky top-4 z-40 bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="mb-3 text-xs text-gray-600">
            📌 今日の予定を追加、または下の日付をクリックして特定の日に追加
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {presetSchedules.map((preset) => {
              const status = preset.schedules[0]?.status || 'online';
              
              // 現在有効な色を取得（カスタム設定を含む）
              const originalColor = getEffectiveStatusColor(status);
              
              // 背景色を薄くした色を生成（白と70%ブレンド）
              const lightBackgroundColor = lightenColor(originalColor, 0.7);
              
              // ボーダー色を少し暗くした色を生成
              const borderColor = darkenColor(lightBackgroundColor, 0.3);
              
              // 色相ベースで調和したテキスト色を決定
              const textColor = getHueBasedTextColor(lightBackgroundColor);
              
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    // プリセット適用前にスクロール位置をキャプチャ
                    captureScrollPosition();
                    const targetDate = selectedDateForPreset || new Date();
                    addPresetSchedule(preset, targetDate);
                  }}
                  className="p-2 text-sm border rounded-lg hover:opacity-80 transition-colors text-left"
                  style={{
                    backgroundColor: lightBackgroundColor,
                    borderColor: borderColor,
                    color: textColor
                  }}
                >
                  <div className="font-medium">{preset.displayName}</div>
                  <div className="text-xs mt-1 opacity-75">
                    {preset.timeDisplay}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedDateForPreset && (
            <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm text-blue-800">
                📅 {format(selectedDateForPreset, 'M月d日(E)', { locale: ja })} に追加します
                <button
                  onClick={() => setSelectedDateForPreset(null)}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 月間ガントチャート（メイン画面と同じ2列構造） */}
        <div className="bg-white shadow rounded-lg relative">
          <div className="flex">
            {/* 左側：日付列（メイン画面のスタッフ名列と同じ構造） */}
            <div className="min-w-fit max-w-[400px] sticky left-0 z-20 bg-white border-r border-gray-200">
              {/* 上部スクロールバー用のスペーサー */}
              <div className="h-[17px] bg-gray-50 border-b"></div>
              {/* ヘッダー行 - 時刻行と同じ高さに調整 */}
              <div className="px-2 py-2 bg-gray-100 font-bold text-gray-600 text-sm text-center border-b whitespace-nowrap">日付 / 担当設定</div>

              {/* 日付行（メイン画面スタイル） */}
              {monthDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const daySchedules = schedules.filter(schedule => {
                  // 基本的な日付マッチング
                  let isMatchingDate = false;
                  if (schedule.date) {
                    isMatchingDate = schedule.date === dayStr;
                  } else if (schedule.start instanceof Date) {
                    isMatchingDate = isSameDay(schedule.start, day);
                  } else if (typeof schedule.start === 'string') {
                    isMatchingDate = isSameDay(new Date(schedule.start), day);
                  }
                  
                  if (!isMatchingDate) return false;
                  
                  // 祝日判定：契約データは祝日に表示しない
                  const scheduleLayer = schedule.layer || 'adjustment';
                  if (scheduleLayer === 'contract') {
                    const holiday = getHoliday(day, holidays);
                    if (holiday) return false; // 祝日なら契約データを非表示
                  }
                  
                  return true;
                });
                
                const isCurrentDay = isToday(day);
                const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0)); // 今日より前の日付
                const holiday = getHoliday(day, holidays);
                const dateColorClass = getDateColor(day, holidays);
                
                return (
                  <div 
                    key={day.getTime()} 
                    className={`px-2 text-sm font-medium whitespace-nowrap ${isCompactMode ? 'h-[32px]' : 'h-[45px]'} ${isPastDate ? 'opacity-50 cursor-default' : 'hover:bg-gray-50 cursor-pointer'} flex items-center border-b border-gray-100 ${
                      isCurrentDay ? 'bg-blue-50 font-semibold text-blue-900' : ''
                    } ${
                      selectedDateForPreset && isSameDay(selectedDateForPreset, day) ? 'bg-blue-100 border-blue-300' : ''
                    } ${
                      holiday ? 'bg-red-50 text-red-600' : ''  // 祝日
                    } ${
                      !holiday && day.getDay() === 0 ? 'bg-red-50 text-red-600' : ''  // 日曜日（祝日でない場合）
                    } ${
                      !holiday && day.getDay() === 6 ? 'bg-blue-50 text-blue-600' : ''  // 土曜日（祝日でない場合）
                    }`}
                    onClick={(e) => {
                      if (isPastDate) return; // 過去の日付は選択不可
                      
                      if (selectedDateForPreset && isSameDay(selectedDateForPreset, day)) {
                        // 担当設定モーダルを開く前にスクロール位置をキャプチャ
                        captureScrollPosition();
                        setSelectedDateForResponsibility(day);
                        setIsResponsibilityModalOpen(true);
                      } else {
                        setSelectedDateForPreset(day);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault(); // 右クリックメニューを無効化
                      if (isPastDate) return;
                      setSelectedDateForPreset(null);
                    }}
                  >
                    <span className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <div className="text-xs font-semibold whitespace-nowrap">
                          {format(day, 'M/d E', { locale: ja })}
                        </div>
                        {holiday && (
                          <div className="text-xs text-red-600 mt-1 whitespace-nowrap">{holiday.name}</div>
                        )}
                        {selectedDateForPreset && isSameDay(selectedDateForPreset, day) && (
                          <div className="text-xs text-blue-600 mt-1 whitespace-nowrap">📌 選択中</div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        {generateResponsibilityBadges(day)}
                      </div>
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* 右側：タイムライン列（メイン画面と同じ構造） */}
            <div className="flex-1 flex flex-col">
              {/* 上部スクロールバー */}
              <div className="overflow-x-auto border-b" ref={topScrollRef} onScroll={handleTopScroll}>
                <div className="min-w-[1300px] h-[17px]"></div>
              </div>
              {/* ヘッダー行 */}
              <div className="sticky top-0 z-10 bg-gray-100 border-b overflow-hidden">
                <div className="min-w-[1300px]">
                  <div className="flex font-bold text-sm">
                    {Array.from({ length: 13 }).map((_, i) => {
                      const hour = 8 + i;
                      const isEarlyOrNight = hour === 8 || hour >= 18;
                      const width = `${(4 / 52) * 100}%`; // 4マス分 = 1時間分の幅
                      return (
                        <div 
                          key={hour} 
                          className={`text-left pl-2 border-r py-2 whitespace-nowrap ${isEarlyOrNight ? 'bg-blue-50' : ''}`}
                          style={{ width }}
                        >
                          {hour}:00
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* タイムライン行（各日付のスケジュール） */}
              <div ref={bottomScrollRef} className="overflow-x-auto" onScroll={handleBottomScroll}>
                <div className="min-w-[1300px]">
                  {monthDays.map((day) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    // O(1)で日付別スケジュールを取得し、祝日フィルタリングを適用
                    const rawDaySchedules = schedulesByDate.get(dayStr) || [];
                    const holiday = holidayByDate.get(dayStr);
                    const daySchedules = rawDaySchedules.filter(schedule => {
                      // 祝日判定：契約データは祝日に表示しない
                      const scheduleLayer = schedule.layer || 'adjustment';
                      if (scheduleLayer === 'contract' && holiday) {
                        return false; // 祝日なら契約データを非表示
                      }
                      return true;
                    });
                    
                    const isCurrentDay = isToday(day);
                    const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0));
                    
                    return (
                      <div 
                        key={`timeline-${day.getTime()}`} 
                        className={`flex border-b border-gray-100 relative ${isCompactMode ? 'h-[32px]' : 'h-[45px]'} ${isPastDate ? 'opacity-50' : ''} ${
                        day.getDay() === 0 ? 'bg-red-50/30' : ''  // 日曜日の背景
                      } ${
                        day.getDay() === 6 ? 'bg-blue-50/30' : ''  // 土曜日の背景
                      }`}
                      onMouseDown={(e) => {
                        if (isPastDate) return; // 過去の日付は操作不可
                        handleTimelineMouseDown(e, day);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault(); // ドロップを許可
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (isPastDate) return; // 過去の日付はドロップ不可
                        handleDrop(e, day);
                      }}
                      style={{ cursor: isPastDate ? 'not-allowed' : (dragInfo ? 'grabbing' : 'default') }}
                    >
                      {isPastDate && (
                        <div className="absolute inset-0 bg-gray-400 opacity-20 z-50 pointer-events-none">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-gray-600 font-medium bg-white px-2 py-1 rounded opacity-80">
                              編集不可
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-0 bottom-0 bg-blue-50 opacity-30 z-10" 
                           style={{ left: `0%`, width: `${((9-8)*4)/52*100}%` }} 
                           title="早朝時間帯（8:00-9:00）">
                      </div>

                      <div className="absolute top-0 bottom-0 bg-blue-50 opacity-30 z-10" 
                           style={{ left: `${((18-8)*4)/52*100}%`, width: `${((21-18)*4)/52*100}%` }} 
                           title="夜間時間帯（18:00-21:00）">
                      </div>

                      {(() => {
                        const markers = [];
                        const isSunday = day.getDay() === 0;
                        
                        for (let hour = 8; hour <= 21; hour++) {
                          for (let minute = 0; minute < 60; minute += 15) {
                            if (hour === 21 && minute > 0) break;
                            const time = hour + minute / 60;
                            const position = timeToPositionPercent(time);
                            const timeString = `${hour}:${String(minute).padStart(2, '0')}`;
                            
                            const isHourMark = minute === 0;
                            markers.push(
                              <div
                                key={`${hour}-${minute}`}
                                className={`absolute top-0 bottom-0 z-5 ${
                                  isHourMark 
                                    ? 'w-0.5 border-l border-gray-300 opacity-50' 
                                    : 'w-0.5 border-l border-gray-200 opacity-30'
                                }`}
                                style={{ left: `${position}%` }}
                                title={timeString}
                              />
                            );
                            
                            if (isSunday && minute === 0) {
                              markers.push(
                                <div
                                  key={`time-${hour}`}
                                  className="absolute top-0 flex items-center text-xs text-gray-500 font-medium opacity-70 pointer-events-none"
                                  style={{ 
                                    left: `${position}%`,
                                    height: '100%',
                                    paddingLeft: '8px'
                                  }}
                                >
                                  {hour}:00
                                </div>
                              );
                            }
                          }
                        }
                        return markers;
                      })()}

                      {daySchedules.map((schedule, index) => {
                        let startHour: number;
                        let endHour: number;
                        
                        if (typeof schedule.start === 'number') {
                          startHour = schedule.start;
                          endHour = schedule.end as number;
                        } else {
                          const startDate = new Date(schedule.start);
                          const endDate = new Date(schedule.end);
                          startHour = startDate.getHours() + startDate.getMinutes() / 60;
                          endHour = endDate.getHours() + endDate.getMinutes() / 60;
                        }

                        const startPosition = timeToPositionPercent(startHour);
                        const endPosition = timeToPositionPercent(endHour);
                        const barWidth = endPosition - startPosition;
                        const isContract = schedule.layer === 'contract';
                        const isHistorical = (schedule as any).layer === 'historical' || (schedule as any).isHistorical;
                        const scheduleLayer = schedule.layer || 'adjustment';
                        const isSelected = selectedSchedule && 
                          selectedSchedule.schedule.id === schedule.id && 
                          selectedSchedule.layer === scheduleLayer;

                        return (
                          <div
                            key={`${schedule.id}-${schedule.layer}-${index}`}
                            data-layer={scheduleLayer}
                            draggable={!isContract && !isHistorical}
                            className={`schedule-block absolute h-6 rounded text-white text-xs flex items-center justify-between px-2 group transition-all duration-200 ${
                              isContract || isHistorical ? 'cursor-default' : 'cursor-ew-resize hover:opacity-80'
                            } ${
                              isHistorical ? 'border-2 border-dashed border-gray-400' : ''
                            } ${
                              isSelected ? 'ring-2 ring-yellow-400 ring-offset-1' : ''
                            }`}
                            style={{
                              left: `${startPosition}%`,
                              width: `${barWidth}%`,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              backgroundColor: getEffectiveStatusColor(schedule.status),
                              opacity: isContract ? 0.5 : isHistorical ? 0.8 : 1,
                              backgroundImage: isContract 
                                ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)' 
                                : isHistorical 
                                ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.15) 10px, rgba(255,255,255,0.15) 20px)'
                                : 'none',
                              zIndex: isContract ? 10 : isHistorical ? 15 : 30,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('スケジュールクリック:', { id: schedule.id, layer: scheduleLayer, isContract, isHistorical });
                              if (!isContract && !isHistorical) {
                                // モーダル開く前にスクロール位置をキャプチャ
                                captureScrollPosition();
                                handleScheduleClick(schedule, scheduleLayer, day);
                              }
                            }}
                            onDragStart={(e) => {
                              if (!isContract && !isHistorical) {
                                console.log('ドラッグ開始:', schedule.id);
                                const scheduleElement = e.currentTarget as HTMLElement;
                                const scheduleRect = scheduleElement.getBoundingClientRect();
                                const mouseOffsetX = e.clientX - scheduleRect.left;
                                setDragOffset(mouseOffsetX);
                                
                                e.dataTransfer.setData('application/json', JSON.stringify({
                                  ...schedule,
                                  sourceDate: format(day, 'yyyy-MM-dd')
                                }));
                                e.dataTransfer.effectAllowed = 'move';
                              }
                            }}
                            onDragEnd={(e) => {
                              console.log('ドラッグ終了:', schedule.id);
                              setDragOffset(0);
                            }}
                            onMouseDown={(e) => {
                              if (isContract || isHistorical) {
                                if (isContract) {
                                  console.log('契約レイヤー要素マウスダウン - ドラッグ許可');
                                } else {
                                  console.log('履歴レイヤー要素マウスダウン');
                                }
                              } else {
                                e.stopPropagation();
                              }
                            }}
                          >
                            <span className="truncate">
                              {capitalizeStatus(schedule.status)}
                              {schedule.memo && (
                                <span className="ml-1 text-yellow-200">📝</span>
                              )}
                            </span>
                            {!isContract && !isHistorical && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  console.log('削除ボタンクリック:', { id: schedule.id, type: typeof schedule.id });
                                  // 削除モーダル開く前にスクロール位置をキャプチャ
                                  captureScrollPosition();
                                  setDeletingScheduleId(schedule.id); 
                                }} 
                                className="text-white hover:text-red-200 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {dragInfo && format(dragInfo.day, 'yyyy-MM-dd') === dayStr && (
                        <div 
                          className="absolute bg-indigo-200 bg-opacity-50 border-2 border-dashed border-indigo-500 rounded pointer-events-none z-30"
                          style={{ 
                            left: `${Math.min(dragInfo.startX, dragInfo.currentX)}px`, 
                            top: '25%', 
                            width: `${Math.abs(dragInfo.currentX - dragInfo.startX)}px`, 
                            height: '50%' 
                          }} 
                        />
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* メイン画面に戻るリンク */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            メイン画面に戻る
          </a>
        </div>
      </div>

      {/* モーダル */}
      <ScheduleModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        staffList={currentStaff ? [currentStaff] : []} 
        onSave={handleSaveSchedule} 
        scheduleToEdit={editingSchedule} 
        initialData={draggedSchedule || undefined} 
      />
      <ConfirmationModal 
        isOpen={deletingScheduleId !== null} 
        onClose={() => setDeletingScheduleId(null)} 
        onConfirm={() => { if (deletingScheduleId) handleDeleteSchedule(deletingScheduleId); }} 
        message="この予定を削除しますか？" 
      />
      
      {/* 担当設定モーダル */}
      {isResponsibilityModalOpen && currentStaff && selectedDateForResponsibility && (
        <ResponsibilityModal
          isOpen={isResponsibilityModalOpen}
          onClose={() => {
            setIsResponsibilityModalOpen(false);
            setSelectedDateForResponsibility(null);
          }}
          staff={currentStaff}
          selectedDate={selectedDateForResponsibility}
          onSave={handleResponsibilitySave}
          existingData={responsibilityData[`${currentStaff.id}-${format(selectedDateForResponsibility, 'yyyy-MM-dd')}`] || null}
        />
      )}

      {/* 統合設定モーダル */}
      <UnifiedSettingsModal
        isOpen={isUnifiedSettingsOpen}
        onClose={() => setIsUnifiedSettingsOpen(false)}
        authenticatedFetch={authenticatedFetch}
        staffList={currentStaff ? [currentStaff] : []}
      />
    </div>
  );
};

// ScheduleModal コンポーネント
const ScheduleModal = ({ isOpen, onClose, staffList, onSave, scheduleToEdit, initialData }: { 
  isOpen: boolean; 
  onClose: () => void; 
  staffList: Staff[]; 
  onSave: (data: any) => void;
  scheduleToEdit: Schedule | null;
  initialData?: Partial<Schedule>;
}) => {
  const [selectedStaff, setSelectedStaff] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [startTime, setStartTime] = useState<number>(9);
  const [endTime, setEndTime] = useState<number>(18);
  const [memo, setMemo] = useState<string>('');

  const timeOptions = useMemo(() => generateTimeOptions(8, 21), []);

  useEffect(() => {
    if (isOpen) {
      if (scheduleToEdit) {
        // 編集モード
        setSelectedStaff(scheduleToEdit.staffId);
        setSelectedStatus(scheduleToEdit.status);
        setStartTime(typeof scheduleToEdit.start === 'number' ? scheduleToEdit.start : 9);
        setEndTime(typeof scheduleToEdit.end === 'number' ? scheduleToEdit.end : 18);
        setMemo(scheduleToEdit.memo || '');
      } else if (initialData) {
        // ドラッグ&ドロップまたはプリセットからの新規作成
        setSelectedStaff(initialData.staffId || (staffList.length > 0 ? staffList[0].id : ''));
        setSelectedStatus(initialData.status || 'online');
        setStartTime(typeof initialData.start === 'number' ? initialData.start : 9);
        setEndTime(typeof initialData.end === 'number' ? initialData.end : 18);
        setMemo(initialData.memo || '');
      } else {
        // 空の新規作成
        setSelectedStaff(staffList.length > 0 ? staffList[0].id : '');
        setSelectedStatus('online');
        setStartTime(9);
        setEndTime(18);
        setMemo('');
      }
    }
  }, [isOpen, scheduleToEdit, initialData, staffList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStaff || !selectedStatus) {
      alert('スタッフとステータスを選択してください');
      return;
    }
    
    if (startTime >= endTime) {
      alert('開始時刻は終了時刻より前に設定してください');
      return;
    }

    const scheduleData = {
      id: scheduleToEdit?.id,
      staffId: Number(selectedStaff),
      status: selectedStatus,
      start: startTime,
      end: endTime,
      memo: memo,
      date: initialData?.date || (scheduleToEdit ? (scheduleToEdit as any).date : undefined)
    };

    onSave(scheduleData);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">
          {scheduleToEdit ? 'スケジュール編集' : 'スケジュール追加'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* スタッフ選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              スタッフ
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
              disabled={staffList.length <= 1}
            >
              <option value="">選択してください</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.department} - {staff.group})
                </option>
              ))}
            </select>
          </div>

          {/* ステータス選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="">選択してください</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {capitalizeStatus(status)}
                </option>
              ))}
            </select>
          </div>

          {/* 開始時刻 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              開始時刻
            </label>
            <select
              value={startTime}
              onChange={(e) => {
                const newStartTime = Number(e.target.value);
                setStartTime(newStartTime);
                if (newStartTime >= endTime) {
                  setEndTime(Math.min(newStartTime + 1, 21));
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {timeOptions.slice(0, -1).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 終了時刻 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              終了時刻
            </label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {timeOptions.filter(option => option.value > startTime).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* メモ */}
          {(selectedStatus === 'meeting' || selectedStatus === 'training' || selectedStatus === 'unplanned') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メモ
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="詳細を入力..."
              />
            </div>
          )}

          {/* ボタン */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {scheduleToEdit ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ConfirmationModal コンポーネント
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  message: string; 
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          確認
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {message}
        </p>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            削除
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// 担当設定モーダルコンポーネント
interface ResponsibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  selectedDate: Date;
  onSave: (data: ResponsibilityData) => void;
  existingData?: ResponsibilityData | null;
}

const ResponsibilityModal: React.FC<ResponsibilityModalProps> = ({
  isOpen,
  onClose,
  staff,
  selectedDate,
  onSave,
  existingData
}) => {
  // 部署判定
  const isReception = staff.department.includes('受付') || staff.group.includes('受付');
  
  // 一般部署用
  const [fax, setFax] = useState(false);
  const [subjectCheck, setSubjectCheck] = useState(false);
  const [custom, setCustom] = useState('');
  
  // 受付部署用
  const [lunch, setLunch] = useState(false);
  const [cs, setCs] = useState(false);

  // 既存データの読み込み（メイン画面と同じロジック）
  useEffect(() => {
    if (isOpen && existingData) {
      console.log('既存担当設定データを読み込み:', existingData);
      
      if (isReception) {
        const r = existingData as ReceptionResponsibilityData;
        setLunch(r.lunch || false);
        setFax(r.fax || false);
        setCs(r.cs || false);
        setCustom(r.custom || '');
      } else {
        const r = existingData as GeneralResponsibilityData;
        setFax(r.fax || false);
        setSubjectCheck(r.subjectCheck || false);
        setCustom(r.custom || '');
      }
    } else if (isOpen && !existingData) {
      // 既存データがない場合は初期化
      console.log('既存担当設定データなし - 初期値を設定');
      setFax(false);
      setSubjectCheck(false);
      setLunch(false);
      setCs(false);
      setCustom('');
    }
  }, [isOpen, existingData, isReception]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isReception) {
      onSave({
        lunch,
        fax,
        cs,
        custom
      } as ReceptionResponsibilityData);
    } else {
      onSave({
        fax,
        subjectCheck,
        custom
      } as GeneralResponsibilityData);
    }
    
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          担当設定 - {format(selectedDate, 'M月d日(E)', { locale: ja })}
        </h2>
        
        <div className="mb-4 p-3 bg-blue-50 rounded border">
          <div className="text-sm text-blue-800">
            <strong>担当者:</strong> {staff.name} ({staff.department})
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {isReception ? (
              // 受付部署用UI
              <>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={lunch}
                    onChange={(e) => setLunch(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">🍽️ 昼当番</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={fax}
                    onChange={(e) => setFax(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">📠 FAX当番</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={cs}
                    onChange={(e) => setCs(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">☎️ CS担当</span>
                </label>
              </>
            ) : (
              // 一般部署用UI
              <>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={fax}
                    onChange={(e) => setFax(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">📠 FAX当番</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={subjectCheck}
                    onChange={(e) => setSubjectCheck(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">📝 件名チェック担当</span>
                </label>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                その他の担当業務
              </label>
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="その他の担当業務があれば入力してください"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default PersonalSchedulePage;
