'use client';

import React, { useState, useEffect, useMemo, useCallback, Fragment, useRef } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthProvider';
import { useGlobalDisplaySettings } from '../hooks/useGlobalDisplaySettings';
// TimelineUtilsをインポート
import {
  timeToPositionPercent,
  positionPercentToTime,
  generateTimeOptions,
  STATUS_COLORS,
  TIMELINE_CONFIG,
  capitalizeStatus,
  getEffectiveStatusColor,
  getContrastTextColor,
  LIGHT_ANIMATIONS,
  BUTTON_STYLES
} from './timeline/TimelineUtils';
// 祝日関連のインポート
import { Holiday } from './types/MainAppTypes';
import { fetchHolidays, getHoliday, getDateColor, formatDateWithHoliday } from './utils/MainAppUtils';
// 統一プリセットシステム
import { usePresetSettings } from '../hooks/usePresetSettings';
import { UnifiedPreset } from './types/PresetTypes';
import { UnifiedSettingsModal } from './modals/UnifiedSettingsModal';
import { JsonUploadModal } from './modals/JsonUploadModal';
import { CsvUploadModal } from './modals/CsvUploadModal';
import { ScheduleModal } from './modals/ScheduleModal';
import { ConfirmationModal } from './modals/ConfirmationModal';
import { getApiUrl, departmentColors, teamColors } from './constants/MainAppConstants';
import { checkSupportedCharacters } from './utils/MainAppUtils';
import { ImportHistory } from './types/MainAppTypes';
import { usePersonalPageDate } from '../../utils/datePersistence';
// 統一担当設定コンポーネントとフック
import { ResponsibilityModal, ResponsibilityBadges, isReceptionStaff } from './responsibility';
import { useResponsibilityData } from '../hooks/useResponsibilityData';
import type { 
  ResponsibilityData as UnifiedResponsibilityData, 
  GeneralResponsibilityData as UnifiedGeneralResponsibilityData, 
  ReceptionResponsibilityData as UnifiedReceptionResponsibilityData 
} from '../types/responsibility';

// --- インポート履歴モーダルコンポーネント ---
const ImportHistoryModal = ({ isOpen, onClose, onRollback, authenticatedFetch }: {
  isOpen: boolean;
  onClose: () => void;
  onRollback: (batchId: string) => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}) => {
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(`${getApiUrl()}/api/csv-import/history`);
      if (!response.ok) {
        throw new Error('履歴の取得に失敗しました');
      }
      const data = await response.json();
      setImportHistory(data);
    } catch (error) {
      console.error('インポート履歴の取得に失敗しました:', error);
      setError(error instanceof Error ? error.message : '履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [isOpen, authenticatedFetch]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRollback = async (batchId: string, recordCount: number) => {
    const confirmed = window.confirm(
      `バッチID: ${batchId}\n` +
      `対象レコード: ${recordCount}件\n\n` +
      'このインポートをロールバック（取り消し）しますか？\n' +
      '※ この操作は元に戻せません'
    );
    
    if (!confirmed) return;
    
    try {
      onRollback(batchId);
      await fetchHistory(); // 履歴を再読み込み
    } catch (error) {
      console.error('ロールバック後の履歴更新に失敗:', error);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">CSVインポート履歴</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading && (
            <div className="text-center py-8">
              <div className="text-gray-600">履歴を読み込み中...</div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="text-red-800 font-medium">エラー</div>
              <div className="text-red-700 text-sm mt-1">{error}</div>
            </div>
          )}
          
          {!loading && !error && importHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              インポート履歴がありません
            </div>
          )}
          
          {!loading && !error && importHistory.length > 0 && (
            <div className="space-y-4">
              {importHistory.map((history) => (
                <div key={history.batchId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 mb-1">
                        バッチID: {history.batchId}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        インポート日時: {new Date(history.importedAt).toLocaleString('ja-JP')}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">投入レコード数:</span>
                          <span className="ml-2 text-blue-600 font-medium">{history.recordCount}件</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">対象スタッフ数:</span>
                          <span className="ml-2 text-green-600 font-medium">{history.staffCount}名</span>
                        </div>
                      </div>
                      <div className="text-sm mt-2">
                        <span className="font-medium text-gray-700">対象日付範囲:</span>
                        <span className="ml-2">{history.dateRange}</span>
                      </div>
                      <div className="text-sm mt-2">
                        <span className="font-medium text-gray-700">対象スタッフ:</span>
                        <span className="ml-2 text-gray-600">
                          {history.staffList ? history.staffList.slice(0, 5).join(', ') : '情報なし'}
                          {history.staffList && history.staffList.length > 5 && ` 他${history.staffList.length - 5}名`}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {history.canRollback ? (
                        <button
                          onClick={() => handleRollback(history.batchId, history.recordCount)}
                          className="px-4 h-7 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium flex items-center"
                        >
                          ロールバック
                        </button>
                      ) : (
                        <div className="px-4 h-7 bg-gray-300 text-gray-500 rounded-md text-sm font-medium cursor-not-allowed flex items-center">
                          期限切れ
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              ※ ロールバックは投入から24時間以内のみ可能です
            </div>
            <button
              onClick={onClose}
              className="px-4 h-7 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium flex items-center"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

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
  
  // デバッグ: 認証状態をログ出力
  useEffect(() => {
    console.log('PersonalSchedulePage 認証状態:', { user, authLoading });
  }, [user, authLoading]);
  
  // 統一プリセットシステム
  const { getPresetsForPage } = usePresetSettings();
  
  // 認証付きfetch関数
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };

    // FormDataを使用する場合はContent-Typeを設定しない（ブラウザが自動設定）
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // トークンを取得して認証ヘッダーに追加
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers
    });
  }, []);

  // 統一担当設定管理フック（個人ページのauthenticatedFetchを渡す）
  const { 
    saveResponsibility,
    loadMonthResponsibilities,
    getResponsibilityForDate
  } = useResponsibilityData(authenticatedFetch);
  
  const [selectedDate, setSelectedDate] = usePersonalPageDate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [allStaffList, setAllStaffList] = useState<Staff[]>([]);
  
  // デバッグ: currentStaff状態をログ出力
  useEffect(() => {
    console.log('PersonalSchedulePage currentStaff状態:', { currentStaff });
  }, [currentStaff]);
  const [contractData, setContractData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentSettings, setDepartmentSettings] = useState<{
    departments: Array<{id: number, name: string, shortName?: string, backgroundColor?: string, displayOrder?: number}>,
    groups: Array<{id: number, name: string, shortName?: string, backgroundColor?: string, displayOrder?: number}>
  }>({ departments: [], groups: [] });
  const [selectedDateForPreset, setSelectedDateForPreset] = useState<Date | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [isResponsibilityModalOpen, setIsResponsibilityModalOpen] = useState(false);
  const [selectedDateForResponsibility, setSelectedDateForResponsibility] = useState<Date | null>(null);
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
  
  // プリセットホバー状態管理
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  
  // インポートモーダル関連の状態
  const [isCsvUploadModalOpen, setIsCsvUploadModalOpen] = useState(false);
  const [isJsonUploadModalOpen, setIsJsonUploadModalOpen] = useState(false);
  const [isImportHistoryModalOpen, setIsImportHistoryModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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

  // プリセット予定（統一プリセットシステムから取得、月次計画と同じ変換処理を使用）
  const presetSchedules: PresetSchedule[] = useMemo(() => {
    const unifiedPresets = getPresetsForPage('personalPage');
    return unifiedPresets.map(preset => {
      // 代表色選択を考慮してスケジュールを決定（月次計画と同じロジック）
      const representativeIndex = preset.representativeScheduleIndex ?? 0;
      const representativeSchedule = preset.schedules[representativeIndex] || preset.schedules[0];
      
      // 小数点時間を正しく変換するヘルパー関数
      const formatDecimalTime = (time: number): string => {
        const hours = Math.floor(time);
        const minutes = Math.round((time % 1) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };

      return {
        id: preset.id,
        name: preset.name,
        displayName: preset.displayName,
        timeDisplay: preset.schedules.length === 1 
          ? `${formatDecimalTime(preset.schedules[0].startTime)}-${formatDecimalTime(preset.schedules[0].endTime)}`
          : `${formatDecimalTime(preset.schedules[0].startTime)}-${formatDecimalTime(preset.schedules[preset.schedules.length - 1].endTime)} + 調整`,
        schedules: preset.schedules.map(schedule => ({
          status: schedule.status,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          memo: schedule.memo
        })),
        // 代表スケジュールの情報を追加
        representativeScheduleIndex: preset.representativeScheduleIndex
      };
    });
  }, [getPresetsForPage]);
  
  // 元のプリセットデータも保持（詳細表示用）
  const originalPresets = useMemo(() => {
    return getPresetsForPage('personalPage');
  }, [getPresetsForPage]);
  
  // プリセットの詳細を取得する関数
  const getPresetDetails = useCallback((presetId: string) => {
    const originalPreset = originalPresets.find(p => p.id === presetId);
    if (!originalPreset) return null;
    
    return originalPreset.schedules.map(schedule => ({
      status: schedule.status,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      memo: schedule.memo || null
    }));
  }, [originalPresets]);

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


  // グローバル表示設定の取得
  const { settings: globalDisplaySettings, isLoading: isSettingsLoading } = useGlobalDisplaySettings(authenticatedFetch);

  // 権限チェック関数
  // 出社状況ページと同じ権限チェック方式を採用
  const hasPermission = useCallback((requiredRole: string | string[], targetStaffId?: number) => {
    if (!user) return false;
    
    // ADMIN は常にアクセス可能
    if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') return true;
    
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // STAFF の場合、自分のスタッフIDと一致する場合のみ編集可能
    if (user.role === 'STAFF' && targetStaffId !== undefined) {
      return targetStaffId === user.staffId;
    }
    
    return roles.includes(user.role);
  }, [user]);

  const canEdit = useCallback((targetStaffId?: number) => {
    return hasPermission(['STAFF', 'ADMIN', 'SYSTEM_ADMIN'], targetStaffId);
  }, [hasPermission]);

  const canManage = useCallback(() => {
    return user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN';
  }, [user?.role]);

  // 部署・グループ設定取得
  const fetchDepartmentSettings = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await authenticatedFetch(`${currentApiUrl}/api/department-settings`);
      if (response.ok) {
        const data = await response.json();
        setDepartmentSettings(data);
      }
    } catch (error) {
      console.warn('Failed to fetch department settings:', error);
    }
  }, [authenticatedFetch]);

  // 動的部署色設定
  const dynamicDepartmentColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    departmentSettings.departments.forEach(dept => {
      if (dept.backgroundColor) {
        colors[dept.name] = dept.backgroundColor;
      }
    });
    return colors;
  }, [departmentSettings.departments]);

  // 動的グループ色設定
  const dynamicTeamColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    departmentSettings.groups.forEach(group => {
      if (group.backgroundColor) {
        colors[group.name] = group.backgroundColor;
      }
    });
    return colors;
  }, [departmentSettings.groups]);

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


  // 現在のユーザーの社員情報を取得
  const fetchCurrentStaff = useCallback(async () => {
    if (!user?.email) {
      console.error('ユーザー情報が取得できません');
      return;
    }

    try {
      const response = await authenticatedFetch(`${getApiUrl()}/api/staff`);
      
      if (response.ok) {
        const staffList: Staff[] = await response.json();
        setAllStaffList(staffList); // 全スタッフリストを保存
        
        let targetStaff: Staff | undefined;
        
        // initialStaffIdが指定されている場合は、指定されたスタッフを表示
        if (initialStaffId) {
          targetStaff = staffList.find(staff => staff.id === initialStaffId);
        } else {
          // 権限別の処理：STAFFは自分のみ、管理者は最初のスタッフ
          if (user.role === 'STAFF') {
            // STAFFの場合：自分に対応する社員を表示
            targetStaff = staffList.find(staff => {
              // Contract テーブルのemailとマッチング
              return staff.name.includes(user.email.split('@')[0]) || 
                     staff.empNo === user.email.split('@')[0];
            });
          } else if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') {
            // 管理者の場合：最初のスタッフを表示（後でスタッフ選択可能）
            if (staffList.length > 0) {
              targetStaff = staffList[0];
              if (isDev) console.log('管理者権限：最初のスタッフを選択');
            }
          }
          
          if (!targetStaff && staffList.length > 0) {
            if (isDev) console.log('対応する社員が見つからないため、最初の社員を使用');
            targetStaff = staffList[0];
          }
        }
        
        if (targetStaff) {
          setCurrentStaff(targetStaff);
          
          // 契約データを取得
          try {
            const contractResponse = await authenticatedFetch(`${getApiUrl()}/api/contracts/staff/${targetStaff.id}`);
            if (contractResponse.ok) {
              const contract = await contractResponse.json();
              setContractData(contract);
            } else {
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
      if (isDebugMode) console.log('スケジュール取得開始:', {
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
        // 🔧 修正：staffIdパラメータを追加してバックエンドでフィルタリング
        const url = `${getApiUrl()}/api/schedules/unified?staffId=${currentStaff.id}&date=${dateStr}&includeMasking=false`;
        if (isDebugMode) console.log(`API呼び出し(個人ページ用): ${url}`);
        
        const response = await authenticatedFetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (isDebugMode) console.log(`${dateStr}のレスポンス:`, data);
          
          // 🔧 修正：バックエンドで既にフィルタリング済みのため、フロントエンド側フィルタリングを削除
          const schedules = data.schedules || [];
          
          // 取得したスケジュールに日付情報を追加
          const schedulesWithDate = schedules.map((schedule: any) => ({
            ...schedule,
            date: dateStr, // 取得日付を明示的に設定
            layer: schedule.layer || 'adjustment', // レイヤー情報を明示的に設定
            start: typeof schedule.start === 'number' ? schedule.start : new Date(schedule.start),
            end: typeof schedule.end === 'number' ? schedule.end : new Date(schedule.end)
          }));
          
          if (isDebugMode) console.log(`${dateStr}のフィルタリング後スケジュール:`, schedulesWithDate.length, '件');
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
    } catch (err) {
      console.error('スケジュールの取得に失敗:', err);
      setError('スケジュールの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentStaff, monthDays, getApiUrl, authenticatedFetch]);

  // スケジュール取得完了後のスクロール復元（独立処理）
  useEffect(() => {
    if (schedules.length > 0 && !loading) {
      restoreScrollPosition();
    }
  }, [schedules, loading, restoreScrollPosition]);

  // 現在の日付の担当設定データを取得する軽量な関数
  // 統一担当設定データ読み込み
  const loadCurrentMonthResponsibilities = useCallback(async () => {
    if (currentStaff) {
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);
      await loadMonthResponsibilities(currentStaff.id, startDate, endDate);
    }
  }, [currentStaff, selectedDate, loadMonthResponsibilities]);

  // 月またはスタッフが変更された時に担当設定データを読み込み
  useEffect(() => {
    loadCurrentMonthResponsibilities();
  }, [loadCurrentMonthResponsibilities]);

  // ページフォーカス時に担当設定データを自動更新
  useEffect(() => {
    const handleFocus = () => {
      loadCurrentMonthResponsibilities();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadCurrentMonthResponsibilities]);

  // 祝日データを初期化
  useEffect(() => {
    fetchHolidays().then(setHolidays);
  }, []);

  // 部署・グループ設定を初期化
  useEffect(() => {
    fetchDepartmentSettings();
  }, [fetchDepartmentSettings]);

  // 初期化処理
  useEffect(() => {
    if (!authLoading && user) {
      fetchCurrentStaff();
    }
  }, [authLoading, user, fetchCurrentStaff]);


  // 設定変更後のデータ再取得・再レンダリング
  const handleSettingsChange = useCallback(async (settings: any) => {
    // スタッフデータの再取得
    await fetchCurrentStaff();
    
    // スケジュールデータの再取得
    if (currentStaff) {
      await fetchSchedules();
      // 担当設定データの再取得
    }
    
    // 表示設定の変更を反映するため、強制的に再レンダリングをトリガー
    // ステータス色や表示名の変更がすぐに反映されるようにする
    setSelectedDate(prev => new Date(prev)); // 同じ日付で再セットしてre-render
  }, [fetchCurrentStaff, currentStaff]);

  // 🔧 修正：月遷移時のfetchSchedulesが実行されるように依存関係を追加
  useEffect(() => {
    if (currentStaff) {
      fetchSchedules();
      // 担当設定データも取得
    }
  }, [currentStaff, fetchSchedules]); // fetchSchedulesを依存関係に追加

  // インポート関連の処理関数
  const handleJsonUpload = async (file: File) => {
    setIsImporting(true);
    try {
      // まずファイル内容を読み取って文字チェックを実行
      const fileContent = await file.text();
      const jsonData = JSON.parse(fileContent);
      
      if (!jsonData.employeeData || !Array.isArray(jsonData.employeeData)) {
        throw new Error('JSONファイルの形式が正しくありません。employeeDataプロパティが必要です。');
      }
      
      // 文字チェックを実行
      const characterCheck = checkSupportedCharacters(jsonData.employeeData);
      
      if (!characterCheck.isValid) {
        const errorMessage = characterCheck.errors.map(error => {
          const fieldName = error.field === 'name' ? '名前' : error.field === 'dept' ? '部署' : 'グループ';
          return `${error.position}行目の${fieldName}「${error.value}」に使用できない文字が含まれています: ${error.invalidChars.join(', ')}`;
        }).join('\n');
        
        alert(`文字チェックエラー:\n\n${errorMessage}\n\n使用可能な文字: ひらがな、カタカナ、漢字（JIS第1-2水準）、英数字、基本記号、全角英数字、反復記号「々」`);
        return;
      }
      
      // 文字チェックが通った場合のみAPIに送信
      const response = await authenticatedFetch(`${getApiUrl()}/api/staff/sync-from-json-body`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // バックエンドからの文字チェックエラーを処理
        if (errorData.message === '文字チェックエラー' && errorData.details) {
          const errorMessage = errorData.details.join('\n');
          alert(`サーバー側文字チェックエラー:\n\n${errorMessage}\n\n${errorData.supportedChars}`);
          return;
        }
        
        throw new Error(errorData.message || 'JSONファイルの同期に失敗しました');
      }
      
      const result = await response.json();
      
      const message = `同期完了:\n追加: ${result.added}名\n更新: ${result.updated}名\n削除: ${result.deleted}名`;
      alert(message);
      
      // データを再取得してUIを更新
      await fetchCurrentStaff();
      await fetchSchedules();
      setIsJsonUploadModalOpen(false);
    } catch (error) {
      console.error('JSONファイルの同期に失敗しました:', error);
      alert('JSONファイルの同期に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsImporting(false);
    }
  };

  const handleCsvUpload = async (file: File) => {
    setIsImporting(true);
    try {
      // CSVファイルを読み込み
      const csvText = await file.text();
      const lines = csvText.trim().split('\n');
      
      if (lines.length < 2) {
        throw new Error('CSVファイルが空または不正です');
      }
      
      // ヘッダー行を確認（オプション）
      const hasHeader = lines[0].toLowerCase().includes('empno') || lines[0].toLowerCase().includes('date');
      const dataLines = hasHeader ? lines.slice(1) : lines;
      
      // データを解析
      const schedules = dataLines.map((line, index) => {
        const columns = line.split(',');
        if (columns.length < 5) {
          throw new Error(`${index + (hasHeader ? 2 : 1)}行目: 必要な列が不足しています`);
        }
        
        // フォーマット: date,empNo,name,status,time,memo,assignmentType,customLabel
        return {
          date: columns[0]?.trim(),
          empNo: columns[1]?.trim(),
          name: columns[2]?.trim(),
          status: columns[3]?.trim(),
          time: columns[4]?.trim(),
          memo: columns[5]?.trim() || undefined,
          assignmentType: columns[6]?.trim() || undefined,
          customLabel: columns[7]?.trim() || undefined
        };
      }).filter(s => s.empNo && s.date && (
        // スケジュール情報または担当設定のいずれかがあればOK
        (s.status && s.time) || s.assignmentType
      ));
      
      const response = await authenticatedFetch(`${getApiUrl()}/api/csv-import/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ schedules })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'CSVファイルのインポートに失敗しました');
      }
      
      const result = await response.json();
      
      const message = `インポート完了:\n投入: ${result.imported}件\n競合: ${result.conflicts?.length || 0}件\n\n${result.batchId ? `バッチID: ${result.batchId}\n※ 問題があればインポート履歴から取り消し可能です` : ''}`;
      alert(message);
      
      // データを再取得してUIを更新
      await fetchSchedules();
      setIsCsvUploadModalOpen(false);
    } catch (error) {
      console.error('CSVファイルのインポートに失敗しました:', error);
      alert('CSVファイルのインポートに失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsImporting(false);
    }
  };

  // ロールバック実行
  const handleRollback = async (batchId: string) => {
    try {
      const response = await authenticatedFetch(`${getApiUrl()}/api/csv-import/rollback`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ロールバックに失敗しました');
      }
      
      const result = await response.json();
      
      const message = `ロールバック完了:\n削除: ${result.deletedCount}件\n\n削除されたデータ:\n${result.details.map((d: any) => `・${d.staff} ${d.date} ${d.status} ${d.time}`).join('\n')}`;
      alert(message);
      
      // データを再取得してUIを更新
      await fetchSchedules();
      setIsImportHistoryModalOpen(false);
    } catch (error) {
      console.error('ロールバックに失敗しました:', error);
      alert('ロールバックに失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // スケジュール更新関数（移動用）
  const handleUpdateSchedule = useCallback(async (scheduleId: number | string, updateData: any) => {
    try {
      if (isDebugMode) console.log('スケジュール更新開始:', { scheduleId, updateData });
      
      const response = await authenticatedFetch(`${getApiUrl()}/api/schedules/${scheduleId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        if (isDebugMode) console.log('スケジュール更新成功');
        
        // まずローカル状態を即座に更新（楽観的更新）
        setSchedules(prevSchedules => 
          prevSchedules.map(schedule => 
            schedule.id === scheduleId 
              ? { ...schedule, ...updateData }
              : schedule
          )
        );
        
        // currentStaffが確実に設定されている場合のみサーバーから再取得
        if (currentStaff) {
          if (isDebugMode) console.log('サーバーからデータ再取得中...');
          await fetchSchedules();
          // スクロール位置を復元
          restoreScrollPosition();
        }
      } else {
        console.error('スケジュール更新失敗:', response.status);
        const errorData = await response.json().catch(() => ({}));
        setError(`スケジュールの更新に失敗しました: ${errorData.message || ''}`);
      }
    } catch (error) {
      console.error('スケジュール更新エラー:', error);
      setError('スケジュールの更新に失敗しました');
    }
  }, [authenticatedFetch, getApiUrl, currentStaff, fetchSchedules, restoreScrollPosition]);

  // クリック判定のための状態
  const [mouseDownTime, setMouseDownTime] = useState<number>(0);
  const [isDragIntended, setIsDragIntended] = useState<boolean>(false);

  // ドロップハンドラー（メイン画面と同じ）
  const handleDrop = useCallback((e: React.DragEvent, day: Date) => {
    try {
      const scheduleData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // ドロップ位置から時刻を計算
      const rect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - rect.left - dragOffset;
      const dropPercent = (dropX / rect.width) * 100;
      const dropTime = positionPercentToTime(Math.max(0, Math.min(100, dropPercent)));
      
      // スケジュールの長さを保持
      const originalStart = typeof scheduleData.start === 'number' ? scheduleData.start : 0;
      const originalEnd = typeof scheduleData.end === 'number' ? scheduleData.end : 0;
      const duration = originalEnd - originalStart;
      
      const snappedStart = Math.round(dropTime * 60) / 60; // 1分単位
      const snappedEnd = Math.round((dropTime + duration) * 60) / 60;
      
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


  // 特定日の既存スケジュールを取得（重複チェック用）
  const fetchExistingSchedulesForDate = useCallback(async (targetDate: Date, staffId: number): Promise<Schedule[]> => {
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    try {
      const response = await authenticatedFetch(`${getApiUrl()}/api/schedules/unified?staffId=${staffId}&date=${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        
        // データが配列でない場合（オブジェクトの可能性）
        if (!Array.isArray(data)) {
          console.warn('[既存スケジュール取得] レスポンスが配列ではありません:', data);
          // データが空のオブジェクトまたは単一オブジェクトの場合
          if (typeof data === 'object' && data !== null) {
            // オブジェクトに配列が含まれているかチェック
            if (data.schedules && Array.isArray(data.schedules)) {
              const mappedSchedules = data.schedules.map((item: any) => ({
                id: item.id,
                status: item.status,
                start: item.start,
                end: item.end,
                memo: item.memo || '',
                layer: item.layer,
                staffId: item.staffId,
                staffName: item.staffName,
                staffDepartment: item.staffDepartment,
                staffGroup: item.staffGroup,
                empNo: item.empNo,
                date: dateStr
              }));
              return mappedSchedules;
            }
            
            // 単一スケジュールオブジェクトの場合
            if (data.id && data.status) {
              return [{
                id: data.id,
                status: data.status,
                start: data.start,
                end: data.end,
                memo: data.memo || '',
                layer: data.layer,
                staffId: data.staffId,
                staffName: data.staffName,
                staffDepartment: data.staffDepartment,
                staffGroup: data.staffGroup,
                empNo: data.empNo,
                date: dateStr
              }];
            }
          }
          
          // 空または無効なデータの場合
          return [];
        }
        
        // 配列の場合の正常処理
        console.log('[既存スケジュール取得] 配列レスポンスを処理:', data.length, '件');
        return data.map((item: any) => ({
          id: item.id,
          status: item.status,
          start: item.start,
          end: item.end,
          memo: item.memo || '',
          layer: item.layer,
          staffId: item.staffId,
          staffName: item.staffName,
          staffDepartment: item.staffDepartment,
          staffGroup: item.staffGroup,
          empNo: item.empNo,
          date: dateStr
        }));
      } else {
        console.warn(`既存スケジュール取得失敗 (${dateStr}):`, response.status);
        return [];
      }
    } catch (error) {
      console.error(`既存スケジュール取得エラー (${dateStr}):`, error);
      return [];
    }
  }, [authenticatedFetch, getApiUrl]);

  // プリセットスケジュールと既存スケジュールの完全一致チェック
  const isScheduleExactMatch = useCallback((presetSchedule: any, existingSchedule: Schedule): boolean => {
    // CLAUDE.md時刻処理ルール：内部では完全UTC処理、APIでは数値（時間）として扱う
    const isTimeMatch = presetSchedule.startTime === existingSchedule.start && 
                       presetSchedule.endTime === existingSchedule.end;
    const isStatusMatch = presetSchedule.status === existingSchedule.status;
    const isMemoMatch = (presetSchedule.memo || '') === (existingSchedule.memo || '');
    
    const isExactMatch = isTimeMatch && isStatusMatch && isMemoMatch;
    
    // 詳細デバッグログ（常に出力）
    if (isDev) {
      console.log('[完全一致チェック]', {
        preset: {
          status: presetSchedule.status,
          start: presetSchedule.startTime,
          end: presetSchedule.endTime,
          memo: presetSchedule.memo || ''
        },
        existing: {
          status: existingSchedule.status,
          start: existingSchedule.start,
          end: existingSchedule.end,
          memo: existingSchedule.memo || '',
          layer: existingSchedule.layer
        },
        checks: {
          timeMatch: isTimeMatch,
          statusMatch: isStatusMatch,
          memoMatch: isMemoMatch
        },
        result: isExactMatch
      });
    }
    
    return isExactMatch;
  }, [isDev]);

  // 重複を除外してプリセットスケジュールをフィルタリング
  const filterNonDuplicateSchedules = useCallback((presetSchedules: any[], existingSchedules: Schedule[]) => {
    console.log('[重複フィルタリング開始]', {
      presetCount: presetSchedules.length,
      existingCount: existingSchedules.length,
      presetSchedules: presetSchedules.map(p => ({ status: p.status, start: p.startTime, end: p.endTime, memo: p.memo })),
      existingSchedules: existingSchedules.map(e => ({ status: e.status, start: e.start, end: e.end, memo: e.memo, layer: e.layer }))
    });
    
    return presetSchedules.filter((presetSchedule, index) => {
      console.log(`[プリセット${index + 1}/${presetSchedules.length}検査]`, {
        status: presetSchedule.status,
        start: presetSchedule.startTime,
        end: presetSchedule.endTime,
        memo: presetSchedule.memo || ''
      });
      
      // レイヤー優先度：adjustment > contract
      // 最上位（優先度最高）の既存スケジュールを取得
      const overlappingSchedules = existingSchedules.filter(existing => {
        // 時間重複チェック
        const isOverlapping = presetSchedule.startTime < existing.end && presetSchedule.endTime > existing.start;
        if (isDev) {
          console.log(`  既存スケジュールとの重複チェック:`, {
            preset: { start: presetSchedule.startTime, end: presetSchedule.endTime },
            existing: { status: existing.status, start: existing.start, end: existing.end, layer: existing.layer },
            comparison: {
              presetStart_lt_existingEnd: presetSchedule.startTime < existing.end,
              presetEnd_gt_existingStart: presetSchedule.endTime > existing.start,
              formula: `${presetSchedule.startTime} < ${existing.end} && ${presetSchedule.endTime} > ${existing.start}`
            },
            isOverlapping
          });
        }
        return isOverlapping;
      });
      
      console.log(`  重複スケジュール数: ${overlappingSchedules.length}`);
      
      if (overlappingSchedules.length === 0) {
        console.log('  → 重複なし：追加対象');
        return true;
      }
      
      // 最上位レイヤーを特定（adjustment > contract）
      const topLayerSchedule = overlappingSchedules.reduce((top, current) => {
        if (current.layer === 'adjustment' && top.layer === 'contract') {
          return current;
        }
        if (current.layer === 'contract' && top.layer === 'adjustment') {
          return top;
        }
        // 同レイヤーの場合は最初のものを維持
        return top;
      });
      
      console.log('  最上位レイヤースケジュール:', {
        status: topLayerSchedule.status,
        start: topLayerSchedule.start,
        end: topLayerSchedule.end,
        memo: topLayerSchedule.memo,
        layer: topLayerSchedule.layer
      });
      
      // 最上位スケジュールと完全一致チェック
      const isExactMatch = isScheduleExactMatch(presetSchedule, topLayerSchedule);
      
      const willAdd = !isExactMatch;
      console.log(`  → 判定結果: ${willAdd ? '追加' : 'スキップ'} (完全一致: ${isExactMatch})`);
      
      return willAdd;
    });
  }, [isScheduleExactMatch, isDev]);

  // プリセット予定を追加（スマート重複回避機能付き）
  const addPresetSchedule = useCallback(async (preset: PresetSchedule, targetDate: Date) => {
    if (!currentStaff) {
      console.error('社員情報が設定されていません');
      setError('社員情報が設定されていません');
      return;
    }

    const dateStr = format(targetDate, 'yyyy-MM-dd');
    if (isDev) {
      console.log('プリセット予定追加（重複回避機能付き）:', {
        preset: preset.name,
        targetDate: dateStr,
        currentStaff: currentStaff.name,
        schedulesCount: preset.schedules.length
      });
    }
    
    try {
      // 1. 既存スケジュールを取得
      const existingSchedules = await fetchExistingSchedulesForDate(targetDate, currentStaff.id);
      if (isDev) {
        console.log('既存スケジュール取得完了:', {
          count: existingSchedules.length,
          schedules: existingSchedules.map(s => ({
            status: s.status,
            start: s.start,
            end: s.end,
            memo: s.memo,
            layer: s.layer
          }))
        });
      }
      
      // 2. 重複していないスケジュールのみをフィルタリング
      const schedulesToAdd = filterNonDuplicateSchedules(preset.schedules, existingSchedules);
      
      if (isDev) {
        console.log('重複チェック結果:', {
          original: preset.schedules.length,
          filtered: schedulesToAdd.length,
          skipped: preset.schedules.length - schedulesToAdd.length
        });
      }
      
      // 3. フィルタリングされたスケジュールを追加
      const url = `${getApiUrl()}/api/schedules`;
      
      for (const schedule of schedulesToAdd) {
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
      
      // 4. 全スケジュール追加後にデータを再取得
      await fetchSchedules();
      // スクロール位置を復元
      restoreScrollPosition();
      
      // 5. 成功メッセージ（透明処理）
      setError(null);
      if (isDev) {
        const addedCount = schedulesToAdd.length;
        const skippedCount = preset.schedules.length - addedCount;
        console.log(`${preset.name}処理完了 - 追加:${addedCount}件, スキップ:${skippedCount}件`);
      }
      
    } catch (err) {
      console.error('スケジュール追加エラー:', err); // エラーログは保持
      setError(`${preset.name}の追加に失敗しました`);
    }
  }, [currentStaff, getApiUrl, authenticatedFetch, fetchExistingSchedulesForDate, filterNonDuplicateSchedules]);

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
            date: scheduleData.date, // 編集対象の予定の日付を使用
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
          date: scheduleData.date, // ドラッグ作成時は必ずscheduleData.dateが設定される
        };
        
        
        const response = await authenticatedFetch(`${getApiUrl()}/api/schedules`, {
          method: 'POST',
          body: JSON.stringify(createData),
        });
        
        if (response.ok) {
          const createdSchedule = await response.json();
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
  }, [currentStaff, getApiUrl, authenticatedFetch]);

  // スケジュール削除ハンドラー
  const handleDeleteSchedule = useCallback(async (scheduleId: number | string) => {
    if (isDev) console.log('スケジュール削除:', scheduleId, typeof scheduleId);
    
    // 削除処理開始時にcurrentStaffを保存
    const staffAtDeletion = currentStaff;
    if (!staffAtDeletion) {
      console.error('削除時にcurrentStaffが設定されていません');
      setError('社員情報が設定されていないため削除できません');
      return;
    }
    
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
        
        // 削除成功時にスケジュール再取得を強制実行
        if (isDev) console.log('削除後スケジュール再取得開始 - staffId:', staffAtDeletion.id);
        setLoading(true);
        setError(null);

        try {
          const promises = monthDays.map(async (day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const url = `${getApiUrl()}/api/schedules/unified?staffId=${staffAtDeletion.id}&date=${dateStr}&includeMasking=false`;
            if (isDebugMode) console.log(`削除後API呼び出し: ${url}`);
            
            const response = await authenticatedFetch(url);
            
            if (response.ok) {
              const data = await response.json();
              const schedules = data.schedules || [];
              
              const schedulesWithDate = schedules.map((schedule: any) => ({
                ...schedule,
                date: dateStr,
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
          if (isDev) console.log('削除後スケジュール再取得完了:', allSchedules.length, '件');
          
          setSchedules(allSchedules);
        } catch (err) {
          console.error('削除後スケジュール再取得失敗:', err);
        } finally {
          setLoading(false);
        }

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
  }, [currentStaff, monthDays, getApiUrl, authenticatedFetch, restoreScrollPosition]);

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

  // 統一担当設定保存処理
  const handleResponsibilitySave = async (responsibilityData: UnifiedResponsibilityData) => {
    if (!currentStaff || !selectedDateForResponsibility) {
      alert('担当設定の保存に必要な情報が不足しています');
      return;
    }

    try {
      const dateString = format(selectedDateForResponsibility, 'yyyy-MM-dd');
      console.log('担当設定保存:', {
        staff: currentStaff.name,
        date: dateString,
        data: responsibilityData
      });
      
      const success = await saveResponsibility(currentStaff.id, dateString, responsibilityData);
      
      if (success) {
        // モーダルを閉じる
        setIsResponsibilityModalOpen(false);
        setSelectedDateForResponsibility(null);
        
        console.log('担当設定保存完了');
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

      // ドラッグ範囲を時刻に変換（1分単位精度）
      const rowWidth = dragInfo.rowRef.offsetWidth;
      const startPercent = (Math.min(dragInfo.startX, dragInfo.currentX) / rowWidth) * 100;
      const endPercent = (Math.max(dragInfo.startX, dragInfo.currentX) / rowWidth) * 100;
      const snappedStart = positionPercentToTime(startPercent);
      const snappedEnd = positionPercentToTime(endPercent);

      if (isDebugMode) console.log('時刻変換:', { snappedStart, snappedEnd });

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
    console.log('handleScheduleClick実行開始:', { scheduleId: schedule.id, layer: scheduleLayer });
    
    if (schedule.layer === 'contract') {
      console.log('契約レイヤーのためスキップ');
      return;
    }
    
    // 過去の日付は編集不可
    const isPastDate = scheduleDate < new Date(new Date().setHours(0, 0, 0, 0));
    console.log('日付チェック:', { scheduleDate, isPastDate });
    if (isPastDate) {
      console.log('過去の日付のためスキップ');
      return;
    }
    
    // 権限チェック（個人ページでは既にonClick条件でチェック済みだが念のため）
    const canEditResult = canEdit(schedule.staffId);
    console.log('権限チェック:', { user: user, userRole: user?.role, scheduleStaffId: schedule.staffId, canEdit: canEditResult });
    if (!canEditResult) {
      console.log('権限不足のためスキップ');
      return;
    }
    
    console.log('選択状態チェック開始');
    const currentSelection = selectedSchedule;
    console.log('現在の選択状態:', currentSelection);
    
    if (currentSelection && 
        currentSelection.schedule.id === schedule.id && 
        currentSelection.layer === scheduleLayer) {
      // 同じ予定を再クリック → 編集モーダルを開く前にスクロール位置をキャプチャ
      console.log('同じ予定を再クリック - モーダルを開く');
      captureScrollPosition();
      setEditingSchedule(schedule);
      setDraggedSchedule(null);
      setIsModalOpen(true);
      setSelectedSchedule(null);
    } else {
      // 異なる予定をクリック → 選択状態にする
      console.log('新しい予定をクリック - 選択状態にする');
      setSelectedSchedule({ schedule, layer: scheduleLayer });
    }
  }, [selectedSchedule, user, canEdit]);

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-2">
          {/* タイトル行 */}
          <div className="bg-indigo-600 px-6 py-3 flex justify-between items-center rounded-t-lg">
            <h1 className="text-lg font-semibold text-white">個人ページ</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-indigo-100">
                {user?.name || user?.email} ({user?.role === 'ADMIN' ? '管理者' : user?.role === 'SYSTEM_ADMIN' ? 'システム管理者' : '一般ユーザー'})
              </span>
              <a
                href="/"
                className={BUTTON_STYLES.headerSecondary}
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
                出社状況
              </a>
              <a
                href="/monthly-planner"
                className={BUTTON_STYLES.headerSecondary}
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                月次計画
              </a>
              <button
                onClick={logout}
                className={BUTTON_STYLES.headerNeutral}
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
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
                  className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 h-7 transition-colors duration-150"
                >
                  &lt;
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedDate(new Date())} 
                  className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border-t border-b border-r border-gray-300 hover:bg-gray-50 h-7 transition-colors duration-150"
                >
                  今月
                </button>
                <button 
                  type="button" 
                  onClick={() => handleMonthChange('next')} 
                  className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 h-7 transition-colors duration-150"
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
                  className="flex items-center px-4 h-7 text-xs font-medium text-white bg-gray-600 border border-transparent rounded-lg shadow-sm hover:bg-gray-700 transition-colors duration-150 min-w-fit whitespace-nowrap"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  設定
                </button>
              )}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCompactModeToggle}
                  title={`表示密度: ${!isCompactMode ? '標準' : 'コンパクト'}`}
                  className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
                    isCompactMode ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  type="button"
                >
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                    isCompactMode ? 'translate-x-4' : 'translate-x-0'
                  }`}></div>
                </button>
                {/* フォントサイズ調整アイコン（大小のA） */}
                <svg 
                  className={`w-4 h-4 ${isCompactMode ? 'text-indigo-600' : 'text-gray-600'}`}
                  viewBox="0 0 512 512" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g>
                    <path d="M452.349,174.924c-2.95-11.607-13.402-19.726-25.377-19.726h-34.875c-11.326,0-21.369,7.27-24.892,18.034
                      l-45.107,137.825l21.184,83.224l19.365-59.17h72.836l18.873,74.142H512L452.349,174.924z M373.354,302.417l27.032-82.607h5.751
                      l21.028,82.607H373.354z" fill="currentColor"></path>
                    <path d="M205.804,65.185h-52.385c-17.012,0-32.097,10.933-37.392,27.108L0,446.815h72.74l36.447-111.374h109.41
                      l28.35,111.374h86.578L243.929,94.818C239.492,77.385,223.794,65.185,205.804,65.185z M125.257,286.338l40.61-124.094h8.641
                      l31.588,124.094H125.257z" fill="currentColor"></path>
                  </g>
                </svg>
              </div>
            </div>
          </div>
          
          {/* 個人情報行 - Google マテリアルデザイン風 */}
          <div className="px-6 py-2 bg-gray-50 border-t">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
              <div className="space-y-2">
                {/* 基本情報カード - 1行デザイン */}
                <div className="flex items-center gap-4 h-12">
                  <div className="bg-indigo-50 rounded-lg pl-4 pr-6 py-0.5 border-l-4 border-indigo-600 flex items-center gap-3 h-full">
                    <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">社員番号:</span>
                    <span className="text-base font-semibold text-indigo-900">{currentStaff.empNo || 'N/A'}</span>
                  </div>
                  
                  <div className="bg-indigo-50 rounded-lg pl-4 pr-6 py-0.5 border-l-4 border-indigo-600 flex items-center gap-3 h-full">
                    <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">名前:</span>
                    <span className="text-base font-semibold text-indigo-900">{currentStaff.name}</span>
                  </div>
                  
                  <div 
                    className="rounded-lg pl-4 pr-6 py-0.5 border-l-4 flex items-center gap-3 h-full"
                    style={{
                      backgroundColor: dynamicDepartmentColors[currentStaff.department] || departmentColors[currentStaff.department] || '#f3f4f6',
                      borderLeftColor: dynamicDepartmentColors[currentStaff.department] || departmentColors[currentStaff.department] || '#9ca3af'
                    }}
                  >
                    <span 
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{ 
                        color: getContrastTextColor(dynamicDepartmentColors[currentStaff.department] || departmentColors[currentStaff.department] || '#9ca3af'),
                        opacity: 0.8 
                      }}
                    >
                      部署:
                    </span>
                    <span 
                      className="text-base font-semibold"
                      style={{ 
                        color: getContrastTextColor(dynamicDepartmentColors[currentStaff.department] || departmentColors[currentStaff.department] || '#9ca3af')
                      }}
                    >
                      {currentStaff.department}
                    </span>
                  </div>
                  
                  <div 
                    className="rounded-lg pl-4 pr-6 py-0.5 border-l-4 flex items-center gap-3 h-full"
                    style={{
                      backgroundColor: dynamicTeamColors[currentStaff.group] || teamColors[currentStaff.group] || '#f3f4f6',
                      borderLeftColor: dynamicTeamColors[currentStaff.group] || teamColors[currentStaff.group] || '#9ca3af'
                    }}
                  >
                    <span 
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{ 
                        color: getContrastTextColor(dynamicTeamColors[currentStaff.group] || teamColors[currentStaff.group] || '#9ca3af'),
                        opacity: 0.8 
                      }}
                    >
                      グループ:
                    </span>
                    <span 
                      className="text-base font-semibold"
                      style={{ 
                        color: getContrastTextColor(dynamicTeamColors[currentStaff.group] || teamColors[currentStaff.group] || '#9ca3af')
                      }}
                    >
                      {currentStaff.group}
                    </span>
                  </div>
                </div>
                
                {/* 契約勤務時間カード */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                      <div className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                        {currentStaff?.workArrangement ? `${currentStaff.workArrangement} / 契約勤務時間` : '契約勤務時間'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {contractData ? (
                        ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'].map((day, index) => {
                          const dayKeys = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
                          const hours = contractData[dayKeys[index]];
                          return hours ? (
                            <span key={day} className="bg-white px-2 py-1 text-xs text-gray-800 border border-gray-300 rounded">
                              {day}: {hours}
                            </span>
                          ) : null;
                        })
                      ) : (
                        <span className="text-gray-600 text-xs">契約データがありません</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-2">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* プリセット予定ボタン */}
        <div className="sticky top-4 z-40 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-2">
          <div className="mb-3 text-xs text-gray-600">
            📌 今日の予定を追加、または下の日付をクリックして特定の日に追加
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {presetSchedules.map((preset) => {
              // プリセット設定の代表色を参照（representativeScheduleIndexを使用）
              const originalPreset = originalPresets.find(p => p.id === preset.id);
              const representativeIndex = originalPreset?.representativeScheduleIndex ?? 0;
              const status = preset.schedules[representativeIndex]?.status || preset.schedules[0]?.status || 'online';
              
              // プリセット設定の代表色を取得（承認済み予定と同じ色システム）
              const backgroundColor = getEffectiveStatusColor(status);
              
              // 月次計画の承認済み予定と同じコントラスト計算
              const getContrastColor = (bgColor: string): string => {
                if (!bgColor || !bgColor.includes('#')) {
                  return '#000000';
                }
                
                const color = bgColor.replace('#', '');
                if (color.length !== 6) {
                  return '#000000';
                }
                
                const r = parseInt(color.substring(0, 2), 16);
                const g = parseInt(color.substring(2, 4), 16);
                const b = parseInt(color.substring(4, 6), 16);
                
                // 明度計算（YIQ公式）
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                
                // 明度が高い（明るい）色なら黒文字、低い（暗い）色なら白文字
                return brightness > 150 ? '#000000' : '#ffffff';
              };
              
              const textColor = getContrastColor(backgroundColor);
              
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    // プリセット適用前にスクロール位置をキャプチャ
                    captureScrollPosition();
                    const targetDate = selectedDateForPreset || new Date();
                    addPresetSchedule(preset, targetDate);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredPreset(preset.id);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoverPosition({
                      x: rect.right + 10,
                      y: rect.top
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredPreset(null);
                  }}
                  className={`rounded-md flex flex-col text-xs text-center pt-1 pb-1 px-2 border-2 border-transparent hover:opacity-80 cursor-pointer ${LIGHT_ANIMATIONS.interactive} relative h-12`}
                  style={{
                    backgroundColor,
                    opacity: 0.9
                  }}
                >
                  {/* 予定種別 */}
                  <div 
                    className="font-medium leading-none mb-0.5 text-sm"
                    style={{ color: textColor }}
                  >
                    {preset.displayName}
                  </div>
                  
                  {/* 時刻表示 */}
                  <div 
                    className="text-xs leading-none"
                    style={{ 
                      color: textColor, 
                      opacity: 0.9 
                    }}
                  >
                    {(() => {
                      // 小数点時間を正しく変換（例: 17.75 → 17:45）
                      const formatDecimalTime = (time: number): string => {
                        const hours = Math.floor(time);
                        const minutes = Math.round((time % 1) * 60);
                        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      };
                      
                      // timeDisplayに小数点時間が含まれている場合は変換
                      if (preset.timeDisplay.includes('.')) {
                        // 複合予定の場合
                        if (preset.timeDisplay.includes(' + 調整')) {
                          const [timeRange, adjustment] = preset.timeDisplay.split(' + ');
                          const [start, end] = timeRange.split('-');
                          const startTime = parseFloat(start.replace(':00', ''));
                          const endTime = parseFloat(end.replace(':00', ''));
                          return `${formatDecimalTime(startTime)}-${formatDecimalTime(endTime)} + 調整`;
                        } else {
                          // 単一予定の場合
                          const [start, end] = preset.timeDisplay.split('-');
                          const startTime = parseFloat(start.replace(':00', ''));
                          const endTime = parseFloat(end.replace(':00', ''));
                          return `${formatDecimalTime(startTime)}-${formatDecimalTime(endTime)}`;
                        }
                      }
                      
                      // 小数点が含まれていない場合はそのまま表示
                      return preset.timeDisplay;
                    })()}
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
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 relative overflow-hidden min-w-[1360px]">
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
                    className={`px-2 text-sm font-medium whitespace-nowrap ${isCompactMode ? 'h-[32px]' : 'h-[45px]'} ${isPastDate ? 'opacity-50 cursor-default' : 'hover:bg-gray-50 cursor-pointer'} flex items-center border-b border-gray-200 ${
                      isCurrentDay ? 'bg-blue-50 font-semibold text-blue-900' : ''
                    } ${
                      selectedDateForPreset && isSameDay(selectedDateForPreset, day) ? 'bg-blue-100 border border-indigo-600' : ''
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
                        // 選択状態で左クリック → 選択解除
                        setSelectedDateForPreset(null);
                      } else {
                        // 未選択状態で左クリック → 選択
                        setSelectedDateForPreset(day);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault(); // 右クリックメニューを無効化
                      if (isPastDate) return;
                      
                      if (selectedDateForPreset && isSameDay(selectedDateForPreset, day)) {
                        // 選択状態で右クリック → 担当設定モーダルを開く
                        captureScrollPosition();
                        setSelectedDateForResponsibility(day);
                        setIsResponsibilityModalOpen(true);
                      }
                    }}
                  >
                    <span className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <div className="text-xs font-semibold whitespace-nowrap">
                          {selectedDateForPreset && isSameDay(selectedDateForPreset, day) ? '📌 ' : ''}
                          {format(day, 'M/d E', { locale: ja })}
                        </div>
                        {holiday && (
                          <div className="text-xs text-red-600 mt-1 whitespace-nowrap">{holiday.name}</div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2 flex-nowrap">
                        <ResponsibilityBadges 
                          responsibilities={currentStaff ? getResponsibilityForDate(currentStaff.id, day) : null}
                          isReception={currentStaff ? isReceptionStaff(currentStaff) : false}
                        />
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
                <div className="min-w-[1120px] h-[17px]"></div>
              </div>
              {/* ヘッダー行 */}
              <div className="sticky top-0 z-10 bg-gray-100 border-b overflow-hidden">
                <div className="min-w-[1120px]">
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
                <div className="min-w-[1120px]">
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
                    }).sort((a, b) => {
                      // レイヤー順: contract(1) < adjustment(2)
                      const layerOrder: { [key: string]: number } = { contract: 1, adjustment: 2 };
                      const aLayer = (a as any).layer || 'adjustment';
                      const bLayer = (b as any).layer || 'adjustment';
                      
                      // 第1優先: レイヤー順序
                      const layerDiff = layerOrder[aLayer] - layerOrder[bLayer];
                      if (layerDiff !== 0) return layerDiff;
                      
                      // 第2優先: 同一調整レイヤー内では後勝ち（updatedAt時刻順）
                      if (aLayer === 'adjustment' && bLayer === 'adjustment') {
                        // updatedAtによる真の「後勝ち」ソート（最後に更新されたものが後に描画される）
                        const aUpdated = new Date((a as any).updatedAt || 0);
                        const bUpdated = new Date((b as any).updatedAt || 0);
                        return aUpdated.getTime() - bUpdated.getTime(); // 古い更新から新しい更新へ
                      }
                      
                      return 0;
                    });
                    
                    const isCurrentDay = isToday(day);
                    const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0));
                    
                    return (
                      <div 
                        key={`timeline-${day.getTime()}`} 
                        className={`flex border-b border-gray-200 relative ${isCompactMode ? 'h-[32px]' : 'h-[45px]'} ${isPastDate ? 'opacity-50' : ''} ${
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
                          for (let minute = 0; minute < 60; minute += 5) {
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
                                    ? 'w-0.5 border-l border-gray-400 opacity-70' 
                                    : 'w-0.5 border-l border-gray-300 opacity-50'
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
                            className={`schedule-block absolute h-6 rounded text-white text-xs flex items-center justify-between px-2 group ${
                              isContract || isHistorical ? 'cursor-default' : `cursor-ew-resize hover:opacity-90 ${LIGHT_ANIMATIONS.schedule}`
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
                              zIndex: isContract ? 10 : isHistorical ? 15 : (30 + index), // 調整レイヤーは後勝ち（後のindexほど高いz-index）
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // ドラッグが意図されていた場合はクリック処理をスキップ
                              console.log('クリック時のドラッグ意図フラグ:', isDragIntended);
                              if (isDragIntended) {
                                console.log('ドラッグ意図のためクリック処理をスキップ');
                                setIsDragIntended(false);
                                return;
                              }
                              console.log('スケジュールクリック:', { id: schedule.id, layer: scheduleLayer, isContract, isHistorical });
                              console.log('クリック条件チェック:', { 
                                isContract, 
                                isHistorical, 
                                canEditResult: canEdit(schedule.staffId),
                                conditionPassed: !isContract && !isHistorical && canEdit(schedule.staffId)
                              });
                              // 出社状況ページと同じ条件チェック
                              if (!isContract && !isHistorical && canEdit(schedule.staffId)) {
                                console.log('handleScheduleClick呼び出し開始');
                                // モーダル開く前にスクロール位置をキャプチャ
                                captureScrollPosition();
                                handleScheduleClick(schedule, scheduleLayer, day);
                              } else {
                                console.log('クリック処理スキップ - 条件不適合');
                              }
                            }}
                            onDragStart={(e) => {
                              if (!isContract && !isHistorical) {
                                console.log('ドラッグ開始:', schedule.id);
                                setIsDragIntended(true); // ドラッグが実際に開始されたらフラグを設定
                                
                                // 出社状況ページと同様に、ドラッグ開始時に選択状態をクリア
                                setSelectedSchedule(null);
                                
                                const scheduleElement = e.currentTarget as HTMLElement;
                                const scheduleRect = scheduleElement.getBoundingClientRect();
                                const mouseOffsetX = e.clientX - scheduleRect.left;
                                setDragOffset(mouseOffsetX);
                                
                                e.dataTransfer.setData('application/json', JSON.stringify({
                                  ...schedule,
                                  sourceDate: format(day, 'yyyy-MM-dd')
                                }));
                                e.dataTransfer.effectAllowed = 'move';
                              } else {
                                // 契約レイヤーや履歴データの場合はドラッグを無効化
                                e.preventDefault();
                              }
                            }}
                            onDragEnd={(e) => {
                              console.log('ドラッグ終了:', schedule.id);
                              setDragOffset(0);
                              // ドラッグ終了後、少し遅延してからフラグをリセット
                              setTimeout(() => setIsDragIntended(false), 50);
                            }}
                            onMouseDown={(e) => {
                              setMouseDownTime(Date.now());
                              setIsDragIntended(false);
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
                            onMouseMove={(e) => {
                              // マウスダウンから一定時間経過していたらドラッグ意図と判定
                              if (mouseDownTime > 0 && (Date.now() - mouseDownTime) > 100) {
                                setIsDragIntended(true);
                              }
                            }}
                            onMouseUp={(e) => {
                              const mouseHoldTime = Date.now() - mouseDownTime;
                              setMouseDownTime(0);
                              // 100ms以下の短いクリックはクリック意図と判定
                              if (mouseHoldTime <= 100) {
                                setIsDragIntended(false);
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
                          className="absolute bg-indigo-200 bg-opacity-50 border-2 border-dashed border-indigo-500 rounded pointer-events-none z-[999]"
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
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 h-7 transition-colors duration-150"
          >
            メイン画面に戻る
          </a>
        </div>
      </div>

      {/* モーダル */}
      <ScheduleModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        staffList={
          // ADMIN・SYSTEM_ADMINは全スタッフ操作可能、STAFFは自分のみ
          (user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN') 
            ? allStaffList 
            : currentStaff ? [{
                id: currentStaff.id,
                empNo: currentStaff.empNo,
                name: currentStaff.name,
                department: currentStaff.department,
                group: currentStaff.group,
                currentStatus: '',
                isActive: currentStaff.isActive ?? true
              }] : []
        } 
        onSave={handleSaveSchedule} 
        scheduleToEdit={editingSchedule ? {
          ...editingSchedule,
          start: typeof editingSchedule.start === 'number' ? editingSchedule.start : 0,
          end: typeof editingSchedule.end === 'number' ? editingSchedule.end : 0
        } : null} 
        initialData={draggedSchedule ? {
          ...draggedSchedule,
          start: typeof draggedSchedule.start === 'number' ? draggedSchedule.start : 0,
          end: typeof draggedSchedule.end === 'number' ? draggedSchedule.end : 0
        } : undefined} 
      />
      <ConfirmationModal 
        isOpen={deletingScheduleId !== null} 
        onClose={() => setDeletingScheduleId(null)} 
        onConfirm={() => { if (deletingScheduleId) handleDeleteSchedule(deletingScheduleId); }} 
        message="この予定を削除しますか？" 
      />
      
      {/* 統一担当設定モーダル */}
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
          existingData={getResponsibilityForDate(currentStaff.id, selectedDateForResponsibility)}
        />
      )}

      {/* 統合設定モーダル */}
      <UnifiedSettingsModal
        isOpen={isUnifiedSettingsOpen}
        onClose={() => setIsUnifiedSettingsOpen(false)}
        onSettingsChange={handleSettingsChange}
        setIsCsvUploadModalOpen={setIsCsvUploadModalOpen}
        setIsJsonUploadModalOpen={setIsJsonUploadModalOpen}
        setIsImportHistoryModalOpen={setIsImportHistoryModalOpen}
        authenticatedFetch={authenticatedFetch}
        staffList={currentStaff ? [currentStaff] : []}
      />

      {/* インポート関連モーダル */}
      <JsonUploadModal 
        isOpen={isJsonUploadModalOpen} 
        onClose={() => setIsJsonUploadModalOpen(false)} 
        onUpload={handleJsonUpload} 
      />
      <CsvUploadModal 
        isOpen={isCsvUploadModalOpen} 
        onClose={() => setIsCsvUploadModalOpen(false)} 
        onUpload={handleCsvUpload} 
      />
      <ImportHistoryModal 
        isOpen={isImportHistoryModalOpen}
        onClose={() => setIsImportHistoryModalOpen(false)}
        onRollback={handleRollback}
        authenticatedFetch={authenticatedFetch}
      />

      {/* インポート中ローディング表示 */}
      {isImporting && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[10001]">
          <div className="bg-white p-6 rounded-lg flex items-center space-x-3 shadow-xl border-2 border-blue-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg font-medium text-gray-700">インポート中...</span>
          </div>
        </div>
      )}

      {/* プリセット詳細ポップアップ */}
      {hoveredPreset && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[60] bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`
          }}
        >
          <div className="text-sm font-medium text-gray-900 mb-2">詳細内訳</div>
          {(() => {
            const details = getPresetDetails(hoveredPreset);
            if (!details || details.length === 0) return <div className="text-xs text-gray-500">詳細情報なし</div>;
            
            return (
              <div className="space-y-1">
                {details.map((schedule, index) => (
                  <div key={index} className="flex items-center text-xs">
                    <div
                      className="w-3 h-3 rounded mr-2"
                      style={{ backgroundColor: getEffectiveStatusColor(schedule.status) }}
                    />
                    <span className="text-gray-700">
                      {String(schedule.startTime).padStart(2, '0')}:00-{String(schedule.endTime).padStart(2, '0')}:00
                    </span>
                    <span className="ml-2 text-gray-500">
                      {capitalizeStatus(schedule.status)}
                    </span>
                    {schedule.memo && (
                      <span className="ml-1 text-gray-400">({schedule.memo})</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
};

export default PersonalSchedulePage;
