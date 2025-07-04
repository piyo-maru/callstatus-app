'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import AuthGuard from '../components/AuthGuard';
import { createPortal } from 'react-dom';
import { STATUS_COLORS, capitalizeStatus, getEffectiveStatusColor, getDepartmentGroupStyle, BUTTON_STYLES, ALL_STATUSES, parseTimeString, formatDecimalTime } from '../components/timeline/TimelineUtils';
import { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import { format } from 'date-fns';
import "react-datepicker/dist/react-datepicker.css";
import { fetchHolidays, getHoliday } from '../components/utils/MainAppUtils';
import { Holiday } from '../components/types/MainAppTypes';
import { usePresetSettings } from '../hooks/usePresetSettings';
import { convertToLegacyFormat } from '../components/constants/PresetSchedules';
import { UnifiedSettingsModal } from '../components/modals/UnifiedSettingsModal';
import { JsonUploadModal } from '../components/modals/JsonUploadModal';
import { CsvUploadModal } from '../components/modals/CsvUploadModal';
import { getApiUrl } from '../components/constants/MainAppConstants';
import { checkSupportedCharacters } from '../components/utils/MainAppUtils';
import { ImportHistory } from '../components/types/MainAppTypes';
import { useMonthlyPlannerDate } from '../../utils/datePersistence';
// 統一担当設定コンポーネントとフック
import { ResponsibilityModal, ResponsibilityBadges, isReceptionStaff } from '../components/responsibility';
import { useResponsibilityData } from '../hooks/useResponsibilityData';
import type { 
  ResponsibilityData as UnifiedResponsibilityData
} from '../types/responsibility';

registerLocale('ja', ja);

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
      const currentApiUrl = getApiUrl();
      const response = await authenticatedFetch(`${currentApiUrl}/api/csv-import/history`);
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

// 型定義
type Staff = {
  id: number;
  empNo?: string;
  name: string;
  department: string;
  group: string;
  isActive?: boolean;
};

// Pending予定データの型定義
type PendingSchedule = {
  id: number;
  staffId: number;
  staffName?: string;
  date: string;
  status: string;
  start: number;
  end: number;
  memo?: string;
  isPending: boolean;
  pendingType: 'monthly-planner' | 'manual';
  approvedBy?: { id: number; name: string };
  approvedAt?: string;
  rejectedBy?: { id: number; name: string };
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
};

// プリセット型定義
type PresetSchedule = {
  key: string;
  label: string;
  status: string;
  start: number;
  end: number;
};

// APIのURL取得は統一されたgetApiUrl関数を使用

// プリセット予定の定義（統一プリセットシステムに移行済み）
// const presetSchedules: PresetSchedule[] = [
//   { key: 'off', label: '休み', status: 'off', start: 9, end: 18 },
//   { key: 'morning-off', label: '午前休', status: 'off', start: 9, end: 13 },
//   { key: 'afternoon-off', label: '午後休', status: 'off', start: 13, end: 18 },
//   { key: 'night-duty', label: '夜間担当', status: 'night duty', start: 18, end: 21 },
//   { key: 'training', label: '研修', status: 'training', start: 9, end: 18 },
//   { key: 'meeting', label: '会議', status: 'meeting', start: 10, end: 12 },
// ];

// 担当設定関連の型定義
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


// 色のコントラスト計算関数
const getContrastColor = (backgroundColor: string, isTransparent: boolean = false): string => {
  // 透明背景（申請中）の場合は元の色を使用
  if (isTransparent) {
    return backgroundColor || '#333333';
  }
  
  // 背景色から明度を計算
  if (!backgroundColor || !backgroundColor.includes('#')) {
    return '#000000'; // デフォルトは黒文字
  }
  
  const color = backgroundColor.replace('#', '');
  if (color.length !== 6) {
    return '#000000'; // 不正な色形式の場合は黒文字
  }
  
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // 明度計算（YIQ公式）
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 明度が高い（明るい）色なら黒文字、低い（暗い）色なら白文字
  return brightness > 150 ? '#000000' : '#ffffff';
};

// 承認状態スタイル取得関数
const getPendingStyle = (pending: PendingSchedule, backgroundColor: string) => {
  if (pending.approvedAt) {
    // 承認済み: 塗りつぶし（現在のスタイル）
    return {
      backgroundColor,
      opacity: 0.9,
      border: '2px solid transparent'
    };
  } else if (pending.rejectedAt) {
    // 却下済み: 薄い塗りつぶし
    return {
      backgroundColor,
      opacity: 0.3,
      border: '2px solid #ef4444'
    };
  } else {
    // 申請中（承認待ち）: 枠のみ
    return {
      backgroundColor: 'transparent',
      opacity: 1,
      border: `2px dashed ${backgroundColor}`
    };
  }
};

// HTML5 Drag&Dropドラッグ可能なPending予定コンポーネント
const DraggablePending: React.FC<{
  pending: PendingSchedule;
  backgroundColor: string;
  textColor: string;
  pendingStyle: any;
  isTransparent: boolean;
  onDragStart: (pending: PendingSchedule) => void;
  onApprovalClick?: (pending: PendingSchedule) => void;
  isApprovalMode?: boolean;
  onCaptureScrollPosition?: () => void;
  onPendingHover?: (pendingId: number | null, position?: { x: number, y: number }) => void;
}> = ({ pending, textColor, pendingStyle, isTransparent, onDragStart, onApprovalClick, isApprovalMode, onCaptureScrollPosition, onPendingHover }) => {
  const canDrag = !pending.approvedAt && !pending.rejectedAt; // 未承認のみドラッグ可能
  const canApprove = !pending.approvedAt && !pending.rejectedAt; // 未承認のみ承認可能
  const isRejected = pending.rejectedAt && !pending.approvedAt; // 却下済み

  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    
    // ドラッグ開始時にスクロール位置をキャプチャ
    if (onCaptureScrollPosition) {
      onCaptureScrollPosition();
    }
    
    e.dataTransfer.setData('application/json', JSON.stringify(pending));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(pending);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isRejected && onApprovalClick) {
      // 却下済み予定の場合は却下理由モーダルを表示
      e.stopPropagation();
      onApprovalClick(pending);
    } else if (isApprovalMode && pending.approvedAt && !pending.rejectedAt && onApprovalClick) {
      // 承認モードで承認済み予定の場合は削除モーダルを表示
      e.stopPropagation();
      onApprovalClick(pending);
    } else if (isApprovalMode && canApprove && onApprovalClick) {
      // 承認モードで未承認予定の場合は承認モーダルを表示
      e.stopPropagation();
      onApprovalClick(pending);
    }
    // 上記以外の場合はstopPropagation()しないため、親のセルクリックイベントが実行される
  };

  const getCursor = () => {
    if (isRejected) return 'cursor-pointer'; // 却下済み予定もクリック可能
    if (isApprovalMode && pending.approvedAt && !pending.rejectedAt) return 'cursor-pointer'; // 承認済み予定もクリック可能
    if (isApprovalMode && canApprove) return 'cursor-pointer';
    if (canDrag) return 'cursor-move';
    return 'cursor-default';
  };

  // ホバーイベントハンドラー
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (onPendingHover) {
      const rect = e.currentTarget.getBoundingClientRect();
      onPendingHover(pending.id, {
        x: rect.right + 10,
        y: rect.top
      });
    }
  };

  const handleMouseLeave = () => {
    if (onPendingHover) {
      onPendingHover(null);
    }
  };

  return (
    <div
      draggable={canDrag && !isApprovalMode}
      onDragStart={handleDragStart}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`w-full h-full rounded-md flex flex-col text-xs text-center pt-1 ${getCursor()}`}
      style={pendingStyle}
    >
      {/* 予定種別 */}
      <div 
        className="font-medium leading-none mb-0.5"
        style={{ color: textColor }}
      >
        {capitalizeStatus(pending.status)}
        {pending.approvedAt && <span className="ml-1">✓</span>}
      </div>
      
      {/* 時刻表示 */}
      <div 
        className="text-xs leading-none"
        style={{ 
          color: textColor, 
          opacity: isTransparent ? 0.8 : 0.9 
        }}
      >
        {String(pending.start).padStart(2, '0')}:00-{String(pending.end).padStart(2, '0')}:00
      </div>
    </div>
  );
};

// HTML5 Drag&Dropドロップ可能なセルコンポーネント
const DroppableCell: React.FC<{
  staffId: number;
  day: number;
  children: React.ReactNode;
  onDrop: (draggedPending: PendingSchedule, targetStaffId: number, targetDay: number) => void;
  hasContract: boolean;
}> = ({ staffId, day, children, onDrop, hasContract }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    
    try {
      const pendingData = e.dataTransfer.getData('application/json');
      const draggedPending: PendingSchedule = JSON.parse(pendingData);
      onDrop(draggedPending, staffId, day);
    } catch (error) {
      console.error('Failed to parse dropped data:', error);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-24 border-r border-b cursor-pointer relative overflow-hidden ${
        hasContract ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-blue-50'
      } ${
        isOver ? 'bg-blue-100 border-blue-400 border-2' : ''
      }`}
      style={{
        minHeight: '65px',
      }}
    >
      {children}
    </div>
  );
};

// 月次計画のメインコンポーネント
function MonthlyPlannerPageContent() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  
  // API呼び出し用の認証付きfetch関数
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };

    // FormDataを使用する場合はContent-Typeを設定しない（ブラウザが自動設定）
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

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
  }, [token, logout]);
  
  // 権限チェック関数
  const canManage = useCallback(() => {
    return user?.role === 'SYSTEM_ADMIN' || user?.role === 'ADMIN';
  }, [user?.role]);
  
  // 統一プリセットシステム
  const { getPresetsForPage } = usePresetSettings();
  
  // 統一担当設定管理フック
  const { 
    saveResponsibility,
    loadMonthResponsibilities,
    loadAllStaffMonthResponsibilities,
    getResponsibilityForDate
  } = useResponsibilityData(authenticatedFetch);
  
  // 月次計画用のプリセットを取得し、レガシー形式に変換
  const monthlyPlannerPresets = useMemo(() => {
    const unifiedPresets = getPresetsForPage('monthlyPlanner');
    return unifiedPresets.map(preset => convertToLegacyFormat(preset)) as PresetSchedule[];
  }, [getPresetsForPage]);
  
  // 元のプリセットデータも保持（詳細表示用）
  const originalPresets = useMemo(() => {
    return getPresetsForPage('monthlyPlanner');
  }, [getPresetsForPage]);
  
  // プリセットの詳細を取得する関数
  const getPresetDetails = useCallback((presetKey: string) => {
    const originalPreset = originalPresets.find(p => p.id === presetKey);
    if (!originalPreset) return null;
    
    return originalPreset.schedules.map(schedule => ({
      status: schedule.status,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      memo: schedule.memo || null
    }));
  }, [originalPresets]);

  // getPresetDetails関数を拡張（一時プリセット対応）
  const getPresetDetailsExtended = useCallback((presetKey: string) => {
    // まず一時プリセットをチェック
    const tempPreset = tempPresets.current.get(presetKey);
    if (tempPreset) {
      return tempPreset.schedules.map((schedule: any) => ({
        status: schedule.status,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        memo: schedule.memo || null
      }));
    }

    // 既存のプリセットをチェック
    const originalPreset = originalPresets.find(p => p.id === presetKey);
    if (!originalPreset) return null;
    
    return originalPreset.schedules.map(schedule => ({
      status: schedule.status,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      memo: schedule.memo || null
    }));
  }, [originalPresets]);

  // Pending予定の詳細を取得する関数
  const getPendingDetails = useCallback((pending: PendingSchedule) => {
    // memoから詳細情報を抽出（JSON形式優先）
    const detailsMatch = pending.memo?.match(/\|details:(.+)$/);
    if (detailsMatch) {
      try {
        const details = JSON.parse(detailsMatch[1]);
        return {
          id: pending.id,
          staffName: pending.staffName,
          status: pending.status,
          startTime: pending.start,
          endTime: pending.end,
          memo: pending.memo,
          createdAt: pending.createdAt,
          approvedAt: pending.approvedAt,
          rejectedAt: pending.rejectedAt,
          approvedBy: pending.approvedBy,
          rejectionReason: pending.rejectionReason,
          presetDetails: details.schedules,
          compositeDescription: details.description,
          isComposite: true
        };
      } catch (error) {
        console.error('Failed to parse composite details from memo:', error);
      }
    }
    
    // fallback: memoからpresetIdを抽出（既存プリセット対応）
    const presetIdMatch = pending.memo?.match(/\|presetId:([^|]+)/);
    if (presetIdMatch) {
      const presetId = presetIdMatch[1];
      // 拡張版のgetPresetDetails関数を使用（一時プリセット対応）
      const presetDetails = getPresetDetailsExtended(presetId);
      if (presetDetails) {
        return {
          id: pending.id,
          staffName: pending.staffName,
          status: pending.status,
          startTime: pending.start,
          endTime: pending.end,
          memo: pending.memo,
          createdAt: pending.createdAt,
          approvedAt: pending.approvedAt,
          rejectedAt: pending.rejectedAt,
          approvedBy: pending.approvedBy,
          rejectionReason: pending.rejectionReason,
          presetDetails: presetDetails,
          isComposite: true
        };
      }
    }
    
    // プリセットでない場合は単一予定として扱う
    return {
      id: pending.id,
      staffName: pending.staffName,
      status: pending.status,
      startTime: pending.start,
      endTime: pending.end,
      memo: pending.memo,
      createdAt: pending.createdAt,
      approvedAt: pending.approvedAt,
      rejectedAt: pending.rejectedAt,
      approvedBy: pending.approvedBy,
      rejectionReason: pending.rejectionReason,
      isComposite: false
    };
  }, [getPresetDetailsExtended]);
  
  // 基本状態 - 初期表示は翌月（永続化対応）
  const [currentMonth, setCurrentMonth] = useMonthlyPlannerDate();
  
  // プリセットホバー状態管理
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  
  // Pending予定ホバー状態管理
  const [hoveredPending, setHoveredPending] = useState<number | null>(null);
  const [pendingHoverPosition, setPendingHoverPosition] = useState({ x: 0, y: 0 });
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading] = useState(false);
  const [, setDraggedPending] = useState<PendingSchedule | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  // 契約表示キャッシュ状態
  const [displayCache, setDisplayCache] = useState<{ [key: string]: boolean }>({});
  const [, setCacheLoading] = useState(false);
  
  
  // 月ナビゲーション関数
  const goToPreviousMonth = useCallback(() => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
  }, [currentMonth]);
  
  const goToNextMonth = useCallback(() => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
  }, [currentMonth]);
  
  // Pending関連状態
  const [pendingSchedules, setPendingSchedules] = useState<PendingSchedule[]>([]);
  
  // 契約スケジュール状態（月次計画では不要 - プリセット登録専用）
  
  // モーダル状態
  const [showModal, setShowModal] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // インポートモーダル関連の状態
  const [isCsvUploadModalOpen, setIsCsvUploadModalOpen] = useState(false);
  const [isJsonUploadModalOpen, setIsJsonUploadModalOpen] = useState(false);
  const [isImportHistoryModalOpen, setIsImportHistoryModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    staffId: number;
    staffName: string;
    day: number;
    dateString: string;
  } | null>(null);
  
  // セル選択状態（2段階操作用）
  const [selectedCellForHighlight, setSelectedCellForHighlight] = useState<{
    staffId: number;
    day: number;
  } | null>(null);

  // 承認モード状態
  const [isApprovalMode, setIsApprovalMode] = useState(false);
  
  // 承認モーダル状態
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedPendingForApproval, setSelectedPendingForApproval] = useState<PendingSchedule | null>(null);
  
  // 却下済み予定モーダル状態
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [selectedRejectedPending, setSelectedRejectedPending] = useState<PendingSchedule | null>(null);

  // 承認済み予定削除モーダル状態
  const [showApprovedDeleteModal, setShowApprovedDeleteModal] = useState(false);
  const [selectedApprovedPending, setSelectedApprovedPending] = useState<PendingSchedule | null>(null);
  const [unapprovalReason, setUnapprovalReason] = useState('');

  // 編集モーダル状態
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPendingForEdit, setSelectedPendingForEdit] = useState<PendingSchedule | null>(null);
  
  // カスタム予定モーダル状態
  const [showCustomScheduleModal, setShowCustomScheduleModal] = useState(false);
  const [customScheduleStatus, setCustomScheduleStatus] = useState('off');
  const [customScheduleStart, setCustomScheduleStart] = useState('09:00');
  const [customScheduleEnd, setCustomScheduleEnd] = useState('18:00');
  const [customScheduleMemo, setCustomScheduleMemo] = useState('');
  
  // カスタム複合予定モーダル状態
  const [showCustomCompositeModal, setShowCustomCompositeModal] = useState(false);
  const [compositeSchedules, setCompositeSchedules] = useState([
    {
      status: 'online',
      startTime: 9,
      endTime: 18,
      memo: ''
    }
  ]);
  const [representativeScheduleIndex, setRepresentativeScheduleIndex] = useState(0);
  const [compositeValidationErrors, setCompositeValidationErrors] = useState<string[]>([]);
  const [compositeDescription, setCompositeDescription] = useState('');
  
  
  // 担当設定モーダル関連の状態
  const [showResponsibilityModal, setShowResponsibilityModal] = useState(false);
  const [selectedCellForResponsibility, setSelectedCellForResponsibility] = useState<{
    staffId: number;
    staffName: string;
    department: string;
    group: string;
    day: number;
    dateString: string;
  } | null>(null);
  
  // 部署・グループフィルター
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  // 部署・グループ設定
  const [departmentSettings, setDepartmentSettings] = useState<{
    departments: any[];
    groups: any[];
  }>({ departments: [], groups: [] });

  // スクロール同期のためのref
  const topScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  
  // スクロール位置保存用（縦・横両対応）
  const [savedScrollPosition, setSavedScrollPosition] = useState({ x: 0, y: 0 });
  
  // スクロール位置キャプチャ関数
  const captureScrollPosition = useCallback(() => {
    const verticalScroll = window.scrollY || document.documentElement.scrollTop || 0;
    const windowScrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    
    // window全体の横スクロール優先、なければ内部要素のスクロール位置を確認
    const topScrollLeft = topScrollRef.current?.scrollLeft || 0;
    const headerScrollLeft = headerScrollRef.current?.scrollLeft || 0;
    const bottomScrollLeft = bottomScrollRef.current?.scrollLeft || 0;
    const horizontalScroll = windowScrollX || Math.max(topScrollLeft, headerScrollLeft, bottomScrollLeft);
    
    setSavedScrollPosition({ x: horizontalScroll, y: verticalScroll });
  }, []);

  // スクロール同期ハンドラー
  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = scrollLeft;
    }
  };
  
  const handleHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = scrollLeft;
    }
  };
  
  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  // 月の日数を取得
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentMonth]);

  // 日付の配列を生成
  const dateArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // 部署・グループマップ
  const departmentMap = useMemo(() => {
    const map = new Map<string, any>();
    departmentSettings.departments.forEach(dept => map.set(dept.name, dept));
    return map;
  }, [departmentSettings.departments]);

  const groupToStaffMap = useMemo(() => {
    const map = new Map<string, any>();
    staffList.forEach(staff => {
      if (!map.has(staff.group)) {
        map.set(staff.group, staff);
      }
    });
    return map;
  }, [staffList]);

  // フィルタリングされたスタッフリスト
  const filteredStaffList = useMemo(() => {
    return staffList.filter(staff => {
      const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
      const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
      return departmentMatch && groupMatch;
    });
  }, [staffList, selectedDepartment, selectedGroup]);

  // 部署とグループの一覧をソート済みで取得
  const sortedDepartments = useMemo(() => {
    const uniqueDepts = Array.from(new Set(staffList.map(s => s.department)));
    return uniqueDepts.sort((a, b) => {
      const settingA = departmentMap.get(a);
      const settingB = departmentMap.get(b);
      const orderA = settingA?.displayOrder || 0;
      const orderB = settingB?.displayOrder || 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b);
    });
  }, [staffList, departmentMap]);

  const sortedGroups = useMemo(() => {
    const filteredStaff = staffList.filter(s => {
      return selectedDepartment === 'all' || s.department === selectedDepartment;
    });
    const uniqueGroups = Array.from(new Set(filteredStaff.map(s => s.group)));
    
    return uniqueGroups.sort((a, b) => {
      const staffA = groupToStaffMap.get(a);
      const staffB = groupToStaffMap.get(b);
      
      if (!staffA || !staffB) return 0;
      
      const deptA = departmentMap.get(staffA.department);
      const deptB = departmentMap.get(staffB.department);
      
      const orderA = deptA?.displayOrder ?? 999;
      const orderB = deptB?.displayOrder ?? 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b, 'ja', { numeric: true });
    });
  }, [staffList, selectedDepartment, groupToStaffMap, departmentMap]);

  // スタッフを部署・グループごとにグループ化してソート
  const groupedStaffForDisplay = useMemo(() => {
    const grouped: { [department: string]: { [group: string]: Staff[] } } = {};
    
    filteredStaffList.forEach(staff => {
      const department = staff.department;
      const group = staff.group;
      if (!grouped[department]) grouped[department] = {};
      if (!grouped[department][group]) grouped[department][group] = [];
      grouped[department][group].push(staff);
    });

    // 各グループ内のスタッフをempNo順でソート
    Object.keys(grouped).forEach(department => {
      Object.keys(grouped[department]).forEach(group => {
        grouped[department][group].sort((a, b) => {
          if (!a.empNo && !b.empNo) return a.id - b.id;
          if (!a.empNo) return 1;
          if (!b.empNo) return -1;
          return a.empNo.localeCompare(b.empNo);
        });
      });
    });

    return grouped;
  }, [filteredStaffList]);

  // 部署・グループの背景色計算
  const departmentColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    departmentSettings.departments.forEach(dept => {
      if (dept.backgroundColor) {
        colors[dept.name] = dept.backgroundColor;
      }
    });
    return colors;
  }, [departmentSettings.departments]);

  const teamColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    departmentSettings.groups.forEach(group => {
      if (group.backgroundColor) {
        colors[group.name] = group.backgroundColor;
      }
    });
    return colors;
  }, [departmentSettings.groups]);

  // ソート関数
  const sortByDisplayOrder = useCallback((entries: [string, any][], type: 'department' | 'group') => {
    return entries.sort((a, b) => {
      const aName = a[0];
      const bName = b[0];
      
      const aSettings = departmentSettings[type === 'department' ? 'departments' : 'groups'].find(s => s.name === aName);
      const bSettings = departmentSettings[type === 'department' ? 'departments' : 'groups'].find(s => s.name === bName);
      
      const aOrder = aSettings?.displayOrder || 0;
      const bOrder = bSettings?.displayOrder || 0;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return aName.localeCompare(bName);
    });
  }, [departmentSettings]);

  // スタッフデータを取得
  const fetchStaffData = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/staff`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStaffList(data.filter((staff: Staff) => staff.isActive !== false));
      }
    } catch (error) {
      console.error('Failed to fetch staff data:', error);
    }
  }, [token]);

  // 契約表示キャッシュを取得
  const fetchDisplayCache = useCallback(async (year: number, month: number) => {
    setCacheLoading(true);
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/monthly-planner/display-cache/${year}/${month}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDisplayCache(data.data || {});
        } else {
          setDisplayCache({});
        }
      } else {
        setDisplayCache({});
      }
    } catch (error) {
      console.error('契約表示キャッシュ取得エラー:', error);
      setDisplayCache({});
    } finally {
      setCacheLoading(false);
    }
  }, []);

  // 部署・グループ設定を取得
  const fetchDepartmentSettings = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/department-settings`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartmentSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch department settings:', error);
    }
  }, [token]);

  // 担当設定データ取得関数（月全体の日毎データを取得）
  // 統一担当設定データ読み込み（月全体・効率化版）
  const fetchResponsibilityData = useCallback(async () => {
    if (staffList.length === 0) return;
    
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      // 全スタッフの担当設定データを一括読み込み（API呼び出し最適化）
      await loadAllStaffMonthResponsibilities(staffList, startDate, endDate);
    } catch (error) {
      console.error('Failed to fetch responsibility data:', error);
    }
  }, [currentMonth, staffList, loadAllStaffMonthResponsibilities]);

  // Pending取得関数（月次計画専用API使用）
  const fetchPendingSchedules = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      const response = await fetch(`${currentApiUrl}/api/schedules/pending/monthly-planner?year=${year}&month=${month}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data: PendingSchedule[] = await response.json();
        setPendingSchedules(data);
      } else {
        console.error('Failed to fetch pending schedules:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch pending schedules:', error);
    }
  }, [currentMonth]);

  // PendingSchedulesをインデックス化したMapでキャッシュ（パフォーマンス最適化）
  const pendingScheduleMap = useMemo(() => {
    const map = new Map<string, PendingSchedule[]>();
    
    pendingSchedules.forEach(pending => {
      const pendingDate = new Date(pending.date).toISOString().split('T')[0];
      const key = `${pending.staffId}-${pendingDate}`;
      
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(pending);
    });
    
    return map;
  }, [pendingSchedules]);

  // セルクリック処理（2段階操作）
  const handleCellClick = useCallback((staff: Staff, day: number) => {
    const currentSelection = selectedCellForHighlight;
    
    // 同じセルを再度クリックした場合はモーダルを表示
    if (currentSelection && 
        currentSelection.staffId === staff.id && 
        currentSelection.day === day) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // 承認済み予定があるセルでは編集を制限（O(1)検索）
      const cellPendings = pendingScheduleMap.get(`${staff.id}-${dateString}`) || [];
      const approvedPending = cellPendings.find(pending => pending.approvedAt);

      if (approvedPending) {
        alert('承認済み予定があるため編集できません。');
        return;
      }
      
      // モーダル開く前にスクロール位置をキャプチャ（統一関数を使用）
      captureScrollPosition();
      
      setSelectedCell({
        staffId: staff.id,
        staffName: staff.name,
        day,
        dateString
      });
      setShowModal(true);
    } else {
      // 初回クリックまたは別のセルクリック時は選択状態にする
      setSelectedCellForHighlight({
        staffId: staff.id,
        day
      });
    }
  }, [currentMonth, selectedCellForHighlight, pendingSchedules]);

  // 予定クリック処理（承認モード・編集モード対応）
  const handleApprovalClick = useCallback((pending: PendingSchedule) => {
    // モーダル開く前にスクロール位置をキャプチャ（統一関数を使用）
    captureScrollPosition();
    
    if (pending.rejectedAt && !pending.approvedAt) {
      // 却下済み予定の場合
      setSelectedRejectedPending(pending);
      setShowRejectedModal(true);
    } else if (pending.approvedAt && !pending.rejectedAt && isApprovalMode) {
      // 承認済み予定で承認モードの場合は削除モーダル表示
      setSelectedApprovedPending(pending);
      setShowApprovedDeleteModal(true);
    } else if (!pending.approvedAt && !pending.rejectedAt) {
      if (isApprovalMode) {
        // 承認モードの場合は承認モーダル表示
        setSelectedPendingForApproval(pending);
        setShowApprovalModal(true);
      } else {
        // 通常モードの場合は編集モーダル表示
        setSelectedPendingForEdit(pending);
        setShowEditModal(true);
      }
    }
  }, [isApprovalMode]);

  // 承認処理
  const handleApprove = useCallback(async (reason: string = '') => {
    if (!selectedPendingForApproval) return;

    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/schedules/pending/${selectedPendingForApproval.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('予定を承認しました');
        await fetchPendingSchedules();
        
        // データ更新後、保存した位置に復元
        const restoreScroll = () => {
          // window全体の横スクロール復元
          if (savedScrollPosition.x > 0) {
            window.scrollTo(savedScrollPosition.x, savedScrollPosition.y || 0);
          } else if (savedScrollPosition.y >= 0) {
            window.scrollTo(0, savedScrollPosition.y);
          }
          
          // 内部要素の横スクロール復元（念のため）
          if (topScrollRef.current && headerScrollRef.current && bottomScrollRef.current && savedScrollPosition.x > 0) {
            topScrollRef.current.scrollLeft = savedScrollPosition.x;
            headerScrollRef.current.scrollLeft = savedScrollPosition.x;
            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
          }
        };
        
        // 複数回復元を試行（DOM更新タイミングの違いに対応）
        setTimeout(restoreScroll, 50);
        setTimeout(restoreScroll, 200);
        setTimeout(restoreScroll, 500);
        
        setShowApprovalModal(false);
        setSelectedPendingForApproval(null);
      } else {
        alert('承認に失敗しました');
      }
    } catch (error) {
      console.error('Failed to approve pending:', error);
      alert('承認に失敗しました');
    }
  }, [selectedPendingForApproval, fetchPendingSchedules]);

  // 却下処理
  const handleReject = useCallback(async (reason: string) => {
    if (!selectedPendingForApproval || !reason.trim()) {
      alert('却下理由を入力してください');
      return;
    }

    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/schedules/pending/${selectedPendingForApproval.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('予定を却下しました');
        await fetchPendingSchedules();
        
        // データ更新後、保存した位置に復元
        const restoreScroll = () => {
          // window全体の横スクロール復元
          if (savedScrollPosition.x > 0) {
            window.scrollTo(savedScrollPosition.x, savedScrollPosition.y || 0);
          } else if (savedScrollPosition.y >= 0) {
            window.scrollTo(0, savedScrollPosition.y);
          }
          
          // 内部要素の横スクロール復元（念のため）
          if (topScrollRef.current && headerScrollRef.current && bottomScrollRef.current && savedScrollPosition.x > 0) {
            topScrollRef.current.scrollLeft = savedScrollPosition.x;
            headerScrollRef.current.scrollLeft = savedScrollPosition.x;
            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
          }
        };
        
        // 複数回復元を試行（DOM更新タイミングの違いに対応）
        setTimeout(restoreScroll, 50);
        setTimeout(restoreScroll, 200);
        setTimeout(restoreScroll, 500);
        
        setShowApprovalModal(false);
        setSelectedPendingForApproval(null);
      } else {
        alert('却下に失敗しました');
      }
    } catch (error) {
      console.error('Failed to reject pending:', error);
      alert('却下に失敗しました');
    }
  }, [selectedPendingForApproval, fetchPendingSchedules]);

  // 却下済み予定のクリア処理
  const handleClearRejected = useCallback(async () => {
    if (!selectedRejectedPending) return;

    if (!confirm('この予定を削除しますか？')) return;

    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/schedules/pending/${selectedRejectedPending.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('予定を削除しました');
        await fetchPendingSchedules();
        
        // データ更新後、保存した位置に復元
        const restoreScroll = () => {
          // window全体の横スクロール復元
          if (savedScrollPosition.x > 0) {
            window.scrollTo(savedScrollPosition.x, savedScrollPosition.y || 0);
          } else if (savedScrollPosition.y >= 0) {
            window.scrollTo(0, savedScrollPosition.y);
          }
          
          // 内部要素の横スクロール復元（念のため）
          if (topScrollRef.current && headerScrollRef.current && bottomScrollRef.current && savedScrollPosition.x > 0) {
            topScrollRef.current.scrollLeft = savedScrollPosition.x;
            headerScrollRef.current.scrollLeft = savedScrollPosition.x;
            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
          }
        };
        
        // 複数回復元を試行（DOM更新タイミングの違いに対応）
        setTimeout(restoreScroll, 50);
        setTimeout(restoreScroll, 200);
        setTimeout(restoreScroll, 500);
        
        setShowRejectedModal(false);
        setSelectedRejectedPending(null);
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to delete rejected pending:', error);
      alert('削除に失敗しました');
    }
  }, [selectedRejectedPending, fetchPendingSchedules]);

  // 承認済み予定削除処理
  const handleUnapproveSchedule = useCallback(async (reason: string) => {
    if (!selectedApprovedPending) return;

    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/schedules/pending/${selectedApprovedPending.id}/unapprove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('承認を取り消しました');
        await fetchPendingSchedules();
        
        // データ更新後、保存した位置に復元
        const restoreScroll = () => {
          // window全体の横スクロール復元
          if (savedScrollPosition.x > 0) {
            window.scrollTo(savedScrollPosition.x, savedScrollPosition.y || 0);
          } else if (savedScrollPosition.y >= 0) {
            window.scrollTo(0, savedScrollPosition.y);
          }
          
          // 内部要素の横スクロール復元（念のため）
          if (topScrollRef.current && headerScrollRef.current && bottomScrollRef.current && savedScrollPosition.x > 0) {
            topScrollRef.current.scrollLeft = savedScrollPosition.x;
            headerScrollRef.current.scrollLeft = savedScrollPosition.x;
            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
          }
        };
        
        // 複数回復元を試行（DOM更新タイミングの違いに対応）
        setTimeout(restoreScroll, 50);
        setTimeout(restoreScroll, 200);
        setTimeout(restoreScroll, 500);
        
        setShowApprovedDeleteModal(false);
        setSelectedApprovedPending(null);
        setUnapprovalReason('');
      } else {
        const errorData = await response.json();
        alert(`承認取り消しに失敗しました: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to unapprove pending:', error);
      alert('承認取り消しに失敗しました');
    }
  }, [selectedApprovedPending, fetchPendingSchedules]);

  // プリセット適用
  const applyPreset = useCallback(async (preset: PresetSchedule) => {
    if (!selectedCell) return;

    // O(1) Map検索を使用
    const cellPendings = pendingScheduleMap.get(`${selectedCell.staffId}-${selectedCell.dateString}`) || [];
    
    // 該当セルに承認済み予定があるかチェック
    const approvedPending = cellPendings.find(pending => pending.approvedAt);

    if (approvedPending) {
      alert('承認済み予定があるため編集できません。');
      return;
    }

    // 該当セルに既存のpending予定があるかチェック
    const existingPending = cellPendings.find(pending => 
      !pending.approvedAt && !pending.rejectedAt
    );

    if (existingPending) {
      alert('このマスには既にpending予定が設定されています。先に既存の予定を削除してください。');
      return;
    }

    try {
      const currentApiUrl = getApiUrl();
      
      const pendingData = {
        staffId: selectedCell.staffId,
        date: selectedCell.dateString,
        status: preset.status,
        start: preset.start,
        end: preset.end,
        memo: `月次計画: ${preset.label}|presetId:${preset.key}`,
        pendingType: 'monthly-planner' as const
      };

      const response = await fetch(`${currentApiUrl}/api/schedules/pending`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(pendingData)
      });

      if (response.ok) {
        alert(`${preset.label}のPending予定を作成しました（承認待ち）`);
        await fetchPendingSchedules();
        
        // データ更新後、保存した位置に復元
        const restoreScroll = () => {
          // window全体の横スクロール復元
          if (savedScrollPosition.x > 0) {
            window.scrollTo(savedScrollPosition.x, savedScrollPosition.y || 0);
          } else if (savedScrollPosition.y >= 0) {
            window.scrollTo(0, savedScrollPosition.y);
          }
          
          // 内部要素の横スクロール復元（念のため）
          if (topScrollRef.current && headerScrollRef.current && bottomScrollRef.current && savedScrollPosition.x > 0) {
            topScrollRef.current.scrollLeft = savedScrollPosition.x;
            headerScrollRef.current.scrollLeft = savedScrollPosition.x;
            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
          }
        };
        
        // 複数回復元を試行（DOM更新タイミングの違いに対応）
        setTimeout(restoreScroll, 50);
        setTimeout(restoreScroll, 200);
        setTimeout(restoreScroll, 500);
      } else {
        alert('Pending予定の作成に失敗しました');
      }
    } catch (error) {
      console.error('Failed to create pending:', error);
      alert('Pending予定の作成に失敗しました');
    }

    setShowModal(false);
    setSelectedCell(null);
    setSelectedCellForHighlight(null);
  }, [selectedCell, pendingScheduleMap, fetchPendingSchedules]);

  // 予定クリア
  const clearSchedule = useCallback(async () => {
    if (!selectedCell) return;

    // O(1) Map検索を使用
    const cellPendings = pendingScheduleMap.get(`${selectedCell.staffId}-${selectedCell.dateString}`) || [];

    if (cellPendings.length === 0) {
      alert('削除する予定がありません');
      setShowModal(false);
      return;
    }

    // 承認済み予定があるかチェック
    const approvedPendings = cellPendings.filter(pending => pending.approvedAt);
    const deletablePendings = cellPendings.filter(pending => !pending.approvedAt && !pending.rejectedAt);

    if (approvedPendings.length > 0) {
      alert('承認済み予定があるため削除できません。');
      setShowModal(false);
      return;
    }

    if (deletablePendings.length === 0) {
      alert('削除可能な予定がありません');
      setShowModal(false);
      return;
    }

    if (!confirm(`${deletablePendings.length}件のPending予定を削除しますか？`)) return;

    try {
      const currentApiUrl = getApiUrl();
      
      for (const pending of deletablePendings) {
        await fetch(`${currentApiUrl}/api/schedules/pending/${pending.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      alert('Pending予定を削除しました');
      await fetchPendingSchedules();
      
      // データ更新後、保存した位置に復元
      const restoreScroll = () => {
        if (topScrollRef.current && bottomScrollRef.current) {
          // 横スクロール復元
          if (savedScrollPosition.x > 0) {
            topScrollRef.current.scrollLeft = savedScrollPosition.x;
            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
          }
          
          // 縦スクロール復元
          if (savedScrollPosition.y >= 0) {
            window.scrollTo(savedScrollPosition.x || 0, savedScrollPosition.y);
          }
        }
      };
      
      // 複数回復元を試行（DOM更新タイミングの違いに対応）
      setTimeout(restoreScroll, 50);
      setTimeout(restoreScroll, 200);
      setTimeout(restoreScroll, 500);
    } catch (error) {
      console.error('Failed to delete pending:', error);
      alert('削除に失敗しました');
    }

    setShowModal(false);
    setSelectedCell(null);
    setSelectedCellForHighlight(null);
  }, [selectedCell, pendingScheduleMap, fetchPendingSchedules]);

  // カスタム複合予定管理関数
  const addCompositeSchedule = useCallback(() => {
    const lastSchedule = compositeSchedules[compositeSchedules.length - 1];
    const newStartTime = lastSchedule ? lastSchedule.endTime : 9;
    const newEndTime = Math.min(newStartTime + 1, 21);

    setCompositeSchedules(prev => [
      ...prev,
      {
        status: 'online',
        startTime: newStartTime,
        endTime: newEndTime,
        memo: ''
      }
    ]);
  }, [compositeSchedules]);

  const removeCompositeSchedule = useCallback((index: number) => {
    setCompositeSchedules(prev => prev.filter((_, i) => i !== index));
    // 代表スケジュールインデックスの調整
    if (representativeScheduleIndex >= compositeSchedules.length - 1) {
      setRepresentativeScheduleIndex(Math.max(0, compositeSchedules.length - 2));
    }
  }, [representativeScheduleIndex, compositeSchedules.length]);

  const updateCompositeSchedule = useCallback((index: number, updates: any) => {
    setCompositeSchedules(prev => 
      prev.map((schedule, i) => 
        i === index ? { ...schedule, ...updates } : schedule
      )
    );
  }, []);

  // 複合予定バリデーション
  const validateCompositeSchedules = useCallback((): string[] => {
    const errors: string[] = [];

    if (compositeSchedules.length === 0) {
      errors.push('少なくとも1つのスケジュールが必要です');
      return errors;
    }

    // 各スケジュールの妥当性チェック
    compositeSchedules.forEach((schedule, index) => {
      if (schedule.startTime >= schedule.endTime) {
        errors.push(`スケジュール${index + 1}: 開始時間は終了時間より前である必要があります`);
      }

      if (schedule.startTime < 8 || schedule.endTime > 21) {
        errors.push(`スケジュール${index + 1}: 時間は8:00-21:00の範囲内で設定してください`);
      }
    });

    // 時間重複チェック
    for (let i = 0; i < compositeSchedules.length; i++) {
      for (let j = i + 1; j < compositeSchedules.length; j++) {
        const schedule1 = compositeSchedules[i];
        const schedule2 = compositeSchedules[j];
        
        if (
          (schedule1.startTime < schedule2.endTime && schedule1.endTime > schedule2.startTime) ||
          (schedule2.startTime < schedule1.endTime && schedule2.endTime > schedule1.startTime)
        ) {
          errors.push(`スケジュール${i + 1}と${j + 1}の時間が重複しています`);
        }
      }
    }

    return errors;
  }, [compositeSchedules]);

  // 一時プリセット管理
  const tempPresets = useRef<Map<string, any>>(new Map());
  
  // 一時プリセットをlocalStorageに保存
  const saveTempPresetsToStorage = useCallback(() => {
    try {
      const presetsArray = Array.from(tempPresets.current.entries());
      localStorage.setItem('callstatus-tempPresets', JSON.stringify(presetsArray));
    } catch (error) {
      console.error('Failed to save temp presets to storage:', error);
    }
  }, []);

  // localStorageから一時プリセットを復元
  const loadTempPresetsFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem('callstatus-tempPresets');
      if (stored) {
        const presetsArray = JSON.parse(stored);
        tempPresets.current = new Map(presetsArray);
      }
    } catch (error) {
      console.error('Failed to load temp presets from storage:', error);
    }
  }, []);

  // 古い一時プリセットをクリーンアップ
  const cleanupOldTempPresets = useCallback(() => {
    try {
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000); // 7日前
      let hasChanges = false;
      
      for (const [key, preset] of tempPresets.current.entries()) {
        if (preset.createdAt) {
          const createdAt = new Date(preset.createdAt).getTime();
          if (createdAt < sevenDaysAgo) {
            tempPresets.current.delete(key);
            hasChanges = true;
          }
        }
      }
      
      if (hasChanges) {
        saveTempPresetsToStorage();
      }
    } catch (error) {
      console.error('Failed to cleanup old temp presets:', error);
    }
  }, [saveTempPresetsToStorage]);

  // ページ読み込み時に一時プリセットを復元
  useEffect(() => {
    loadTempPresetsFromStorage();
    // 古い一時プリセットをクリーンアップ（7日以上前のものを削除）
    cleanupOldTempPresets();
  }, [loadTempPresetsFromStorage, cleanupOldTempPresets]);

  // ページフォーカス時に担当設定データを自動更新
  useEffect(() => {
    const handleFocus = () => {
      fetchResponsibilityData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchResponsibilityData]);

  const createTempPreset = useCallback((schedules: any[], representativeIndex: number, description?: string) => {
    const tempId = `custom-composite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const representativeSchedule = schedules[representativeIndex] || schedules[0];
    
    const tempPreset = {
      id: tempId,
      name: `カスタム複合予定-${tempId}`,
      displayName: 'カスタム複合予定',
      description: description || `${schedules.length}個の予定を組み合わせた複合予定`,
      category: 'general',
      schedules: schedules.map(schedule => ({
        status: schedule.status,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        memo: schedule.memo || ''
      })),
      representativeScheduleIndex: representativeIndex,
      isActive: true,
      customizable: true,
      // 代表スケジュールの情報をトップレベルに設定（既存API互換のため）
      status: representativeSchedule.status,
      start: representativeSchedule.startTime,
      end: representativeSchedule.endTime,
      label: 'カスタム複合予定',
      createdAt: new Date().toISOString() // 作成日時を追加
    };

    // 一時プリセットを保存
    tempPresets.current.set(tempId, tempPreset);
    
    // localStorageに保存
    saveTempPresetsToStorage();
    
    return tempPreset;
  }, [saveTempPresetsToStorage]);

  // スタッフ名クリック時の個人ページ遷移（全ユーザー閲覧可能）
  const handleStaffNameClick = useCallback((staffId: number) => {
    router.push(`/personal/${staffId}`);
  }, [router]);

  // 編集モーダル用の削除処理
  const handleEditDelete = useCallback(async () => {
    if (!selectedPendingForEdit) return;

    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/schedules/pending/${selectedPendingForEdit.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('未承認予定を削除しました');
        await fetchPendingSchedules();
        
        // データ更新後、保存した位置に復元
        const restoreScroll = () => {
          // window全体の横スクロール復元
          if (savedScrollPosition.x > 0) {
            window.scrollTo(savedScrollPosition.x, savedScrollPosition.y || 0);
          } else if (savedScrollPosition.y >= 0) {
            window.scrollTo(0, savedScrollPosition.y);
          }
          
          // 内部要素の横スクロール復元（念のため）
          if (topScrollRef.current && headerScrollRef.current && bottomScrollRef.current && savedScrollPosition.x > 0) {
            topScrollRef.current.scrollLeft = savedScrollPosition.x;
            headerScrollRef.current.scrollLeft = savedScrollPosition.x;
            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
          }
        };
        
        // 複数回復元を試行（DOM更新タイミングの違いに対応）
        setTimeout(restoreScroll, 50);
        setTimeout(restoreScroll, 200);
        setTimeout(restoreScroll, 500);
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to delete pending:', error);
      alert('削除に失敗しました');
    }

    setShowEditModal(false);
    setSelectedPendingForEdit(null);
  }, [selectedPendingForEdit, fetchPendingSchedules]);

  // 編集モーダル用のプリセット更新処理
  const handleEditUpdate = useCallback(async (preset: PresetSchedule) => {
    if (!selectedPendingForEdit) return;

    try {
      const currentApiUrl = getApiUrl();
      
      const updateData = {
        status: preset.status,
        start: preset.start,
        end: preset.end,
        memo: `月次計画: ${preset.label}`
      };

      const response = await fetch(`${currentApiUrl}/api/schedules/pending/${selectedPendingForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        alert(`未承認予定を${preset.label}に更新しました`);
        await fetchPendingSchedules();
        
        // データ更新後、保存した位置に復元
        const restoreScroll = () => {
          // window全体の横スクロール復元
          if (savedScrollPosition.x > 0) {
            window.scrollTo(savedScrollPosition.x, savedScrollPosition.y || 0);
          } else if (savedScrollPosition.y >= 0) {
            window.scrollTo(0, savedScrollPosition.y);
          }
          
          // 内部要素の横スクロール復元（念のため）
          if (topScrollRef.current && headerScrollRef.current && bottomScrollRef.current && savedScrollPosition.x > 0) {
            topScrollRef.current.scrollLeft = savedScrollPosition.x;
            headerScrollRef.current.scrollLeft = savedScrollPosition.x;
            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
          }
        };
        
        // 複数回復元を試行（DOM更新タイミングの違いに対応）
        setTimeout(restoreScroll, 50);
        setTimeout(restoreScroll, 200);
        setTimeout(restoreScroll, 500);
      } else {
        alert('更新に失敗しました');
      }
    } catch (error) {
      console.error('Failed to update pending:', error);
      alert('更新に失敗しました');
    }

    setShowEditModal(false);
    setSelectedPendingForEdit(null);
  }, [selectedPendingForEdit, fetchPendingSchedules]);

  // セル内のスケジュール取得関数 - O(1) Map検索
  const getCellPendings = useCallback((staffId: number, day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return pendingScheduleMap.get(`${staffId}-${dateString}`) || [];
  }, [currentMonth, pendingScheduleMap]);


  // 契約スケジュール有無判定関数（キャッシュベース）
  const hasContractSchedule = useCallback((staffId: number, day: number) => {
    // 祝日判定：祝日は契約データ無効（既存ロジック維持）
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const date = new Date(year, month - 1, day);
    const holiday = getHoliday(date, holidays);
    if (holiday) return false;
    
    // キャッシュから契約情報を参照
    const cacheKey = `${staffId}-${day}`;
    const hasContract = displayCache[cacheKey];
    
    
    // キャッシュデータのみを信頼し、ない場合は契約なしとして扱う
    return hasContract === true;
  }, [currentMonth, holidays, displayCache]);

  // Pending予定のドラッグ&ドロップ処理
  const handlePendingDrop = useCallback(async (draggedPending: PendingSchedule, targetStaffId: number, targetDay: number) => {
    if (draggedPending.staffId !== targetStaffId) {
      // 異なるスタッフには移動不可
      alert('同じスタッフの予定のみ移動できます');
      return;
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const targetDateString = `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
    
    // 元の日付と同じ場合は何もしない
    const originalDate = new Date(draggedPending.date).toISOString().split('T')[0];
    if (originalDate === targetDateString) {
      return;
    }

    try {
      const currentApiUrl = getApiUrl();
      
      // 移動先に承認済み予定があるかチェック
      const approvedPendings = pendingSchedules.filter(p => {
        const pDate = new Date(p.date).toISOString().split('T')[0];
        return p.staffId === targetStaffId && pDate === targetDateString && p.approvedAt;
      });

      if (approvedPendings.length > 0) {
        alert('承認済み予定があるため移動できません。');
        return;
      }
      
      // 移動先に既存のpending予定があるかチェック
      const targetPendings = pendingSchedules.filter(p => {
        const pDate = new Date(p.date).toISOString().split('T')[0];
        return p.staffId === targetStaffId && pDate === targetDateString && !p.approvedAt && !p.rejectedAt;
      });

      if (targetPendings.length > 0) {
        // 重複拒否：1つのマスには1つのpending予定のみ
        alert(`${targetDay}日には既にpending予定が設定されています。先に既存の予定を削除してください。`);
        return;
      }

      // ドラッグされた予定を新しい日付に移動
      const response = await fetch(`${currentApiUrl}/api/schedules/pending/${draggedPending.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: targetDateString
        })
      });

      if (response.ok) {
        alert('予定を移動しました');
        await fetchPendingSchedules();
        
        // データ更新後、保存した位置に復元
        const restoreScroll = () => {
          // window全体の横スクロール復元
          if (savedScrollPosition.x > 0) {
            window.scrollTo(savedScrollPosition.x, savedScrollPosition.y || 0);
          } else if (savedScrollPosition.y >= 0) {
            window.scrollTo(0, savedScrollPosition.y);
          }
          
          // 内部要素の横スクロール復元（念のため）
          if (topScrollRef.current && headerScrollRef.current && bottomScrollRef.current && savedScrollPosition.x > 0) {
            topScrollRef.current.scrollLeft = savedScrollPosition.x;
            headerScrollRef.current.scrollLeft = savedScrollPosition.x;
            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
          }
        };
        
        // 複数回復元を試行（DOM更新タイミングの違いに対応）
        setTimeout(restoreScroll, 50);
        setTimeout(restoreScroll, 200);
        setTimeout(restoreScroll, 500);
      } else {
        alert('予定の移動に失敗しました');
      }
    } catch (error) {
      console.error('Failed to move pending:', error);
      alert('予定の移動に失敗しました');
    }
  }, [currentMonth, pendingSchedules, fetchPendingSchedules]);

  // 担当設定保存関数
  const saveResponsibilityData = useCallback(async (staffId: number, date: string, newResponsibilityData: ResponsibilityData) => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/responsibilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          staffId,
          date,
          responsibilities: newResponsibilityData
        })
      });
      
      if (response.ok) {
        // 担当設定データを再取得して最新状態に同期
        await fetchResponsibilityData();
        
        return true;
      } else {
        console.error('担当設定保存失敗:', response.status);
        return false;
      }
    } catch (error) {
      console.error('担当設定保存エラー:', error);
      return false;
    }
  }, []);

  // セルの右クリック処理（担当設定モーダル用）
  const handleCellRightClick = useCallback((e: React.MouseEvent, staff: Staff, day: number) => {
    e.preventDefault();
    
    // 承認モードでのみ担当設定可能
    if (!isApprovalMode) {
      return;
    }
    
    // モーダル開く前にスクロール位置をキャプチャ（統一関数を使用）
    captureScrollPosition();
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    setSelectedCellForResponsibility({
      staffId: staff.id,
      staffName: staff.name,
      department: staff.department,
      group: staff.group,
      day,
      dateString
    });
    setShowResponsibilityModal(true);
  }, [isApprovalMode, currentMonth]);

  // 初期データ取得
  useEffect(() => {
    fetchStaffData();
    fetchDepartmentSettings();
    
    // 祝日データ取得
    const loadHolidays = async () => {
      try {
        const holidayData = await fetchHolidays();
        setHolidays(holidayData);
      } catch (error) {
        console.error('祝日データの取得に失敗しました:', error);
      }
    };
    loadHolidays();
  }, [fetchStaffData, fetchDepartmentSettings]);

  // 月が変更された時にpendingデータと担当設定データと契約表示キャッシュを取得
  useEffect(() => {
    if (staffList.length > 0) {
      fetchPendingSchedules();
      fetchResponsibilityData();
      
      // 契約表示キャッシュを取得
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      fetchDisplayCache(year, month);
    }
  }, [currentMonth, staffList, fetchPendingSchedules, fetchResponsibilityData, fetchDisplayCache]);

  // 設定変更後のデータ再取得
  const handleSettingsChange = useCallback(async (settings: any) => {
    // スタッフデータの再取得
    await fetchStaffData();
    
    // 部署・グループ設定の再取得
    await fetchDepartmentSettings();
    
    // pending予定の再取得
    await fetchPendingSchedules();
    
    // 担当設定データの再取得
    await fetchResponsibilityData();
    
    // 契約表示キャッシュの再取得
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    await fetchDisplayCache(year, month);
  }, [fetchStaffData, fetchDepartmentSettings, fetchPendingSchedules, fetchResponsibilityData, fetchDisplayCache, currentMonth]);

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
      const currentApiUrl = getApiUrl();
      
      const response = await authenticatedFetch(`${currentApiUrl}/api/staff/sync-from-json-body`, {
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
      await fetchStaffData();
      await fetchDepartmentSettings();
      if (staffList.length > 0) {
        await fetchPendingSchedules();
        await fetchResponsibilityData();
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        await fetchDisplayCache(year, month);
      }
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
      
      const currentApiUrl = getApiUrl();

      const response = await authenticatedFetch(`${currentApiUrl}/api/csv-import/schedules`, {
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
      await fetchStaffData();
      if (staffList.length > 0) {
        await fetchPendingSchedules();
        await fetchResponsibilityData();
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        await fetchDisplayCache(year, month);
      }
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
      const currentApiUrl = getApiUrl();
      const response = await authenticatedFetch(`${currentApiUrl}/api/csv-import/rollback`, {
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
      await fetchStaffData();
      if (staffList.length > 0) {
        await fetchPendingSchedules();
        await fetchResponsibilityData();
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        await fetchDisplayCache(year, month);
      }
      setIsImportHistoryModalOpen(false);
    } catch (error) {
      console.error('ロールバックに失敗しました:', error);
      alert('ロールバックに失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* ヘッダー - 個人ページと同じレイアウト */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-2">
        {/* タイトル行 */}
        <div className="bg-indigo-600 px-6 py-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">月次計画</h1>
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
                href="/personal"
                className={BUTTON_STYLES.headerSecondary}
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                個人ページ
              </a>
              {(user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN') && (
                <a
                  href="/admin/pending-approval"
                  className={BUTTON_STYLES.headerPrimary}
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                  </svg>
                  申請承認管理
                </a>
              )}
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
        </div>
        
        {/* ナビゲーション行 */}
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button 
                type="button" 
                onClick={goToPreviousMonth}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 h-7 transition-colors duration-150"
              >
                &lt;
              </button>
              <button 
                type="button" 
                onClick={() => setCurrentMonth(new Date())}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border-t border-b border-r border-gray-300 hover:bg-gray-50 h-7 transition-colors duration-150"
              >
                今月
              </button>
              <button 
                type="button" 
                onClick={goToNextMonth}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 h-7 transition-colors duration-150"
              >
                &gt;
              </button>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </h2>
          </div>

          {/* 承認モードトグルと設定ボタン */}
          <div className="flex items-center space-x-4">
            {canManage() && (
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-3 py-1 text-xs font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 h-7 transition-colors duration-150"
              >
                ⚙️ 設定
              </button>
            )}
            {canManage() && (
              <div className="flex items-center space-x-3">
                <span className={`text-xs ${!isApprovalMode ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  通常
                </span>
                <button
                  onClick={() => setIsApprovalMode(!isApprovalMode)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    isApprovalMode ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  type="button"
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    isApprovalMode ? 'translate-x-6' : 'translate-x-0'
                  }`}></div>
                </button>
                <span className={`text-xs ${isApprovalMode ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  承認モード
                </span>
              </div>
            )}
          </div>
        </div>

        {/* フィルター行 */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center space-x-6">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm text-xs h-7 px-2 font-medium text-gray-700 bg-white transition-colors duration-150 hover:border-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">すべての部署</option>
            {sortedDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm text-xs h-7 px-2 font-medium text-gray-700 bg-white transition-colors duration-150 hover:border-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">すべてのグループ</option>
            {sortedGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-none mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 relative" style={{ minWidth: `${Math.max(1360, dateArray.length * 96 + 200)}px` }}>
            {/* 統一ヘッダー行 */}
            <div className="sticky top-0 z-30 flex bg-gray-100 border-b shadow-sm">
              <div className="min-w-fit max-w-[200px] w-[200px] px-2 py-2 font-bold text-gray-600 text-xs text-center border-r whitespace-nowrap overflow-hidden text-ellipsis">
                部署 / グループ / スタッフ名
              </div>
              <div className="flex-1 overflow-x-auto" ref={headerScrollRef} onScroll={handleHeaderScroll} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="min-w-[1300px]" style={{ width: `${dateArray.length * 96}px` }}>
                  <div className="flex">
                    {dateArray.map(day => {
                      const year = currentMonth.getFullYear();
                      const month = currentMonth.getMonth();
                      const date = new Date(year, month, day);
                      const dayOfWeek = date.getDay();
                      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
                      const getTextColor = () => {
                        // 祝日判定：祝日は赤色
                        const holiday = getHoliday(date, holidays);
                        if (holiday) return 'text-red-600';
                        // 土曜日は青色、日曜日は赤色
                        if (dayOfWeek === 0) return 'text-red-600';
                        if (dayOfWeek === 6) return 'text-blue-600';
                        return 'text-gray-900';
                      };
                      return (
                        <div key={day} className={`w-24 px-2 py-2 text-center font-bold text-xs border-r ${getTextColor()}`}>
                          {day}日({dayNames[dayOfWeek]})
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex">
              {/* 左側：スタッフ一覧 */}
              <div className="min-w-fit max-w-[200px] w-[200px] sticky left-0 z-20 bg-white border-r border-gray-200">
                  
                  {/* スタッフリスト */}
                  {Object.keys(groupedStaffForDisplay).length > 0 ? (
                    sortByDisplayOrder(Object.entries(groupedStaffForDisplay), 'department').map(([department, groups]) => (
                      <div key={department} className="department-group">
                        <h3 
                          className="px-2 min-h-[33px] text-sm font-bold whitespace-nowrap flex items-center" 
                          style={getDepartmentGroupStyle(departmentColors[department] || '#f5f5f5')}
                        >
                          {department}
                        </h3>
                        {sortByDisplayOrder(Object.entries(groups), 'group').map(([group, staffInGroup]) => (
                          <div key={group}>
                            <h4 
                              className="px-2 pl-6 min-h-[33px] text-xs font-semibold whitespace-nowrap flex items-center" 
                              style={getDepartmentGroupStyle(teamColors[group] || '#f5f5f5')}
                            >
                              {group}
                            </h4>
                            {staffInGroup.map((staff: any) => (
                              <div 
                                key={staff.id} 
                                className="px-2 pl-12 text-sm font-medium whitespace-nowrap h-[65px] hover:bg-gray-50 flex items-center border-b"
                              >
                                <button
                                  onClick={() => handleStaffNameClick(staff.id)}
                                  className="staff-name text-left hover:text-blue-600 hover:underline transition-colors"
                                  title="個人ページを表示"
                                >
                                  {staff.name}
                                </button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 whitespace-nowrap">
                      表示対象のスタッフがいません。
                    </div>
                  )}
                </div>

              {/* 右側：日付グリッド */}
              <div className="flex-1">
                {/* セルグリッド */}
                <div className="overflow-x-auto" ref={bottomScrollRef} onScroll={handleBottomScroll}>
                    <div className="min-w-[1300px]" style={{ width: `${dateArray.length * 96}px` }}>
                    {Object.keys(groupedStaffForDisplay).length > 0 ? (
                      sortByDisplayOrder(Object.entries(groupedStaffForDisplay), 'department').map(([department, groups]) => (
                        <div key={department}>
                          {/* 部署ヘッダー行 */}
                          <div className="flex h-[33px]">
                            {dateArray.map(day => (
                              <div key={day} className="w-24 border-r border-b" style={getDepartmentGroupStyle(departmentColors[department] || '#f5f5f5')}></div>
                            ))}
                          </div>
                          
                          {sortByDisplayOrder(Object.entries(groups), 'group').map(([group, staffInGroup]) => (
                            <div key={group}>
                              {/* グループヘッダー行 */}
                              <div className="flex h-[33px]">
                                {dateArray.map(day => (
                                  <div key={day} className="w-24 border-r border-b" style={getDepartmentGroupStyle(teamColors[group] || '#f5f5f5')}></div>
                                ))}
                              </div>
                              
                              {/* スタッフ行 - 社員名と同じ高さに調整 */}
                              {staffInGroup.map((staff: any) => (
                                <div key={staff.id} className="flex h-[65px]">
                                  {dateArray.map(day => {
                                    const pendings = getCellPendings(staff.id, day);
                                    const hasContract = hasContractSchedule(staff.id, day);
                                    
                                    return (
                                      <DroppableCell
                                        key={day}
                                        staffId={staff.id}
                                        day={day}
                                        onDrop={handlePendingDrop}
                                        hasContract={hasContract}
                                      >
                                        <div
                                          onClick={() => handleCellClick(staff, day)}
                                          onContextMenu={(e) => handleCellRightClick(e, staff, day)}
                                          className={`w-full h-full flex flex-col cursor-pointer ${
                                            selectedCellForHighlight?.staffId === staff.id && 
                                            selectedCellForHighlight?.day === day
                                              ? 'ring-2 ring-blue-500 ring-inset bg-blue-50'
                                              : 'hover:bg-gray-100'
                                          }`}
                                          title={isApprovalMode ? '右クリックで担当設定' : ''}
                                        >
                                          {/* Pendingスケジュール表示領域（45px） */}
                                          <div className="h-11 relative">
                                            {pendings.map((pending) => {
                                              const backgroundColor = getEffectiveStatusColor(pending.status);
                                              const pendingStyle = getPendingStyle(pending, backgroundColor);
                                              const isTransparent = pendingStyle.backgroundColor === 'transparent';
                                              const textColor = getContrastColor(backgroundColor, isTransparent);
                                              
                                              return (
                                                <div key={`pending-${pending.id}`} className="absolute inset-1 flex items-center justify-center z-10">
                                                  <DraggablePending
                                                    pending={pending}
                                                    backgroundColor={backgroundColor}
                                                    textColor={textColor}
                                                    pendingStyle={pendingStyle}
                                                    isTransparent={isTransparent}
                                                    onDragStart={setDraggedPending}
                                                    onApprovalClick={handleApprovalClick}
                                                    isApprovalMode={isApprovalMode}
                                                    onCaptureScrollPosition={captureScrollPosition}
                                                    onPendingHover={(pendingId, position) => {
                                                      setHoveredPending(pendingId);
                                                      if (position) {
                                                        setPendingHoverPosition(position);
                                                      }
                                                    }}
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                          
                                          {/* 担当設定バッジ表示領域（16px） */}
                                          <div className="h-4 px-1 py-0.5 flex flex-wrap items-center justify-center gap-1 text-xs">
                                            {(() => {
                                              const year = currentMonth.getFullYear();
                                              const month = currentMonth.getMonth() + 1;
                                              const cellDate = new Date(year, month - 1, day);
                                              
                                              return (
                                                <ResponsibilityBadges
                                                  responsibilities={getResponsibilityForDate(staff.id, cellDate)}
                                                  isReception={isReceptionStaff(staff)}
                                                />
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </DroppableCell>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-gray-500">表示対象のスタッフがいません。</div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* プリセット選択モーダル */}
      {showModal && selectedCell && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">
                  予定登録
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedCellForHighlight(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{selectedCell.staffName}</span> さんの
                  <span className="font-medium">{selectedCell.day}日</span> の予定
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium text-gray-700">プリセット予定を選択</h4>
                {monthlyPlannerPresets.map(preset => (
                  <button
                    key={preset.key}
                    onClick={() => applyPreset(preset)}
                    onMouseEnter={(e) => {
                      setHoveredPreset(preset.key);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoverPosition({
                        x: rect.right + 10,
                        y: rect.top
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredPreset(null);
                    }}
                    className="w-full text-left px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center relative"
                  >
                    <div
                      className="w-4 h-4 rounded mr-3"
                      style={{ backgroundColor: getEffectiveStatusColor(preset.status) }}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{preset.label}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {preset.start}:00 - {preset.end}:00
                      </span>
                    </div>
                  </button>
                ))}
                
                {/* カスタム予定ボタン */}
                <button
                  onClick={() => {
                    // モーダル開く前にスクロール位置をキャプチャ
                    captureScrollPosition();
                    setShowCustomScheduleModal(true);
                  }}
                  className="w-full text-left px-3 py-2 border-2 border-dashed border-blue-300 rounded-md hover:bg-blue-50 hover:border-blue-400 flex items-center relative"
                >
                  <div className="w-4 h-4 rounded mr-3 bg-blue-400 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-blue-600">カスタム予定</span>
                    <span className="text-sm text-blue-500 ml-2">
                      ステータス・時間・メモを自由設定
                    </span>
                  </div>
                </button>

                {/* カスタム複合予定ボタン */}
                <button
                  onClick={() => {
                    // モーダル開く前にスクロール位置をキャプチャ
                    captureScrollPosition();
                    setShowCustomCompositeModal(true);
                  }}
                  className="w-full text-left px-3 py-2 border-2 border-dashed border-green-300 rounded-md hover:bg-green-50 hover:border-green-400 flex items-center relative"
                >
                  <div className="w-4 h-4 rounded mr-3 bg-green-400 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">⚡</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-green-600">カスタム複合予定</span>
                    <span className="text-sm text-green-500 ml-2">
                      複数の予定を組み合わせて申請
                    </span>
                  </div>
                </button>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={clearSchedule}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center"
                >
                  予定クリア
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedCellForHighlight(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 flex items-center justify-center"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* カスタム予定設定モーダル */}
      {showCustomScheduleModal && selectedCell && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">カスタム予定設定</h3>
                <button
                  onClick={() => {
                    setShowCustomScheduleModal(false);
                    setCustomScheduleStatus('off');
                    setCustomScheduleStart('09:00');
                    setCustomScheduleEnd('18:00');
                    setCustomScheduleMemo('');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">{selectedCell.staffName}</span> の
                  <span className="font-medium">{selectedCell.day}日</span> の予定設定
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {/* ステータス選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ステータス
                  </label>
                  <select
                    value={customScheduleStatus}
                    onChange={(e) => setCustomScheduleStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ALL_STATUSES.map(status => (
                      <option key={status} value={status}>
                        {capitalizeStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 時刻設定 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      開始時刻
                    </label>
                    <input
                      type="time"
                      value={customScheduleStart}
                      onChange={(e) => setCustomScheduleStart(e.target.value)}
                      min="08:00"
                      max="21:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      終了時刻
                    </label>
                    <input
                      type="time"
                      value={customScheduleEnd}
                      onChange={(e) => setCustomScheduleEnd(e.target.value)}
                      min="08:00"
                      max="21:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* メモ入力（全ステータス対応） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メモ（任意）
                  </label>
                  <textarea
                    value={customScheduleMemo}
                    onChange={(e) => setCustomScheduleMemo(e.target.value)}
                    placeholder="予定の詳細や備考を入力..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {customScheduleMemo.length}/200文字
                  </div>
                </div>

                {/* バリデーションエラー表示 */}
                {parseTimeString(customScheduleStart) >= parseTimeString(customScheduleEnd) && (
                  <div className="text-red-600 text-sm">
                    終了時刻は開始時刻より後に設定してください
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={async () => {
                    // バリデーション
                    const startDecimal = parseTimeString(customScheduleStart);
                    const endDecimal = parseTimeString(customScheduleEnd);
                    
                    if (startDecimal >= endDecimal) {
                      alert('終了時刻は開始時刻より後に設定してください');
                      return;
                    }

                    // 該当セルに既存のpending予定があるかチェック
                    const cellPendings = pendingScheduleMap.get(`${selectedCell.staffId}-${selectedCell.dateString}`) || [];
                    
                    // 承認済み予定があるかチェック
                    const approvedPending = cellPendings.find(pending => pending.approvedAt);
                    if (approvedPending) {
                      alert('承認済み予定があるため編集できません。');
                      return;
                    }

                    // 未承認のpending予定があるかチェック
                    const existingPending = cellPendings.find(pending => 
                      !pending.approvedAt && !pending.rejectedAt
                    );
                    if (existingPending) {
                      alert('このマスには既にpending予定が設定されています。先に既存の予定を削除してください。');
                      return;
                    }

                    try {
                      const currentApiUrl = getApiUrl();
                      
                      const pendingData = {
                        staffId: selectedCell.staffId,
                        date: selectedCell.dateString,
                        status: customScheduleStatus,
                        start: startDecimal,
                        end: endDecimal,
                        memo: customScheduleMemo || `月次計画: ${capitalizeStatus(customScheduleStatus)}`,
                        pendingType: 'monthly-planner' as const
                      };

                      const response = await fetch(`${currentApiUrl}/api/schedules/pending`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json' 
                        },
                        body: JSON.stringify(pendingData)
                      });

                      if (response.ok) {
                        alert(`${capitalizeStatus(customScheduleStatus)}のPending予定を作成しました（承認待ち）`);
                        await fetchPendingSchedules();
                        
                        // データ更新後、保存した位置に復元
                        const restoreScroll = () => {
                          // window全体の横スクロール復元
                          if (savedScrollPosition.x > 0) {
                            window.scrollTo(savedScrollPosition.x, savedScrollPosition.y || 0);
                          } else if (savedScrollPosition.y >= 0) {
                            window.scrollTo(0, savedScrollPosition.y);
                          }
                          
                          // 内部要素の横スクロール復元（念のため）
                          if (topScrollRef.current && headerScrollRef.current && bottomScrollRef.current && savedScrollPosition.x > 0) {
                            topScrollRef.current.scrollLeft = savedScrollPosition.x;
                            headerScrollRef.current.scrollLeft = savedScrollPosition.x;
                            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
                          }
                        };
                        
                        // 複数回復元を試行（DOM更新タイミングの違いに対応）
                        setTimeout(restoreScroll, 50);
                        setTimeout(restoreScroll, 200);
                        setTimeout(restoreScroll, 500);
                        
                        // モーダルを閉じる
                        setShowCustomScheduleModal(false);
                        setShowModal(false);
                        setSelectedCellForHighlight(null);
                        setCustomScheduleStatus('off');
                        setCustomScheduleStart('09:00');
                        setCustomScheduleEnd('18:00');
                        setCustomScheduleMemo('');
                      } else {
                        const errorData = await response.json();
                        alert(`カスタム予定の作成に失敗しました: ${errorData.message || '不明なエラー'}`);
                      }
                    } catch (error) {
                      console.error('Failed to create custom schedule:', error);
                      alert('カスタム予定の作成に失敗しました');
                    }
                  }}
                  disabled={parseTimeString(customScheduleStart) >= parseTimeString(customScheduleEnd)}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  申請する
                </button>
                <button
                  onClick={() => {
                    setShowCustomScheduleModal(false);
                    setCustomScheduleStatus('off');
                    setCustomScheduleStart('09:00');
                    setCustomScheduleEnd('18:00');
                    setCustomScheduleMemo('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 flex items-center justify-center"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* カスタム複合予定設定モーダル */}
      {showCustomCompositeModal && selectedCell && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">カスタム複合予定設定</h3>
              <button
                onClick={() => {
                  setShowCustomCompositeModal(false);
                  setCompositeSchedules([{
                    status: 'online',
                    startTime: 9,
                    endTime: 18,
                    memo: ''
                  }]);
                  setRepresentativeScheduleIndex(0);
                  setCompositeValidationErrors([]);
                  setCompositeDescription('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* スタッフ・日付情報 */}
            <div className="px-6 py-3 bg-gray-50 border-b">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{selectedCell.staffName}</span> の
                <span className="font-medium">{selectedCell.day}日</span> の複合予定設定
              </p>
              <p className="text-xs text-gray-500 mt-1">
                複数の予定を組み合わせて1日のスケジュールを作成できます
              </p>
            </div>

            {/* メインコンテンツ */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* 複合予定の説明 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    複合予定の説明
                  </label>
                  <textarea
                    value={compositeDescription}
                    onChange={(e) => setCompositeDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={2}
                    placeholder="この複合予定全体の説明を入力してください（オプション）"
                  />
                </div>

                {/* スケジュール設定 */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-gray-900">予定リスト</h4>
                    <button
                      type="button"
                      onClick={addCompositeSchedule}
                      className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                    >
                      + 予定追加
                    </button>
                  </div>

                  {/* バリデーションエラー表示 */}
                  {compositeValidationErrors.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      {compositeValidationErrors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">⚠️ {error}</p>
                      ))}
                    </div>
                  )}

                  <div className="space-y-4">
                    {compositeSchedules.map((schedule, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium text-gray-900">予定 {index + 1}</h5>
                          {compositeSchedules.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCompositeSchedule(index)}
                              className="text-red-500 hover:text-red-700 transition-colors text-sm"
                            >
                              削除
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ステータス
                            </label>
                            <div className="relative">
                              <select
                                value={schedule.status}
                                onChange={(e) => updateCompositeSchedule(index, { status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              >
                                {ALL_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {capitalizeStatus(status, true)}
                                  </option>
                                ))}
                              </select>
                              <div 
                                className="absolute right-9 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded"
                                style={{ backgroundColor: getEffectiveStatusColor(schedule.status) }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              開始時刻
                            </label>
                            <input
                              type="time"
                              value={`${Math.floor(schedule.startTime).toString().padStart(2, '0')}:${Math.round((schedule.startTime % 1) * 60).toString().padStart(2, '0')}`}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                updateCompositeSchedule(index, { startTime: hours + (minutes / 60) });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              終了時刻
                            </label>
                            <input
                              type="time"
                              value={`${Math.floor(schedule.endTime).toString().padStart(2, '0')}:${Math.round((schedule.endTime % 1) * 60).toString().padStart(2, '0')}`}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                updateCompositeSchedule(index, { endTime: hours + (minutes / 60) });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              メモ
                            </label>
                            <input
                              type="text"
                              value={schedule.memo || ''}
                              onChange={(e) => updateCompositeSchedule(index, { memo: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="メモ（オプション）"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 代表色選択（複数スケジュールの場合のみ表示） */}
                {compositeSchedules.length > 1 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      🎨 代表色設定
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      複数の予定がある場合、カレンダーに表示される色を選択してください
                    </p>
                    
                    <div className="space-y-2">
                      {compositeSchedules.map((schedule, index) => (
                        <label 
                          key={index} 
                          className="flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="representativeSchedule"
                            value={index}
                            checked={representativeScheduleIndex === index}
                            onChange={() => setRepresentativeScheduleIndex(index)}
                            className="mr-3 text-green-600"
                          />
                          <div 
                            className="w-4 h-4 rounded mr-3"
                            style={{ backgroundColor: getEffectiveStatusColor(schedule.status) }}
                          ></div>
                          <div className="flex-1">
                            <span className="text-sm font-medium">
                              {capitalizeStatus(schedule.status, true)}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {Math.floor(schedule.startTime)}:{Math.round((schedule.startTime % 1) * 60).toString().padStart(2, '0')}
                              -
                              {Math.floor(schedule.endTime)}:{Math.round((schedule.endTime % 1) * 60).toString().padStart(2, '0')}
                            </span>
                            {schedule.memo && (
                              <span className="text-xs text-gray-400 ml-2">({schedule.memo})</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="flex justify-between items-center p-6 border-t bg-gray-50">
              <div className="text-sm text-gray-500">
                {compositeValidationErrors.length > 0 && (
                  <span className="text-red-600">⚠️ {compositeValidationErrors.length}個のエラーがあります</span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCustomCompositeModal(false);
                    setCompositeSchedules([{
                      status: 'online',
                      startTime: 9,
                      endTime: 18,
                      memo: ''
                    }]);
                    setRepresentativeScheduleIndex(0);
                    setCompositeValidationErrors([]);
                    setCompositeDescription('');
                  }}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={async () => {
                    // バリデーション実行
                    const errors = validateCompositeSchedules();
                    setCompositeValidationErrors(errors);

                    if (errors.length > 0) {
                      return;
                    }

                    // 該当セルに既存のpending予定があるかチェック
                    const cellPendings = pendingScheduleMap.get(`${selectedCell.staffId}-${selectedCell.dateString}`) || [];
                    
                    // 承認済み予定があるかチェック
                    const approvedPending = cellPendings.find(pending => pending.approvedAt);
                    if (approvedPending) {
                      alert('承認済み予定があるため編集できません。');
                      return;
                    }

                    // 未承認のpending予定があるかチェック
                    const existingPending = cellPendings.find(pending => 
                      !pending.approvedAt && !pending.rejectedAt
                    );
                    if (existingPending) {
                      alert('このマスには既にpending予定が設定されています。先に既存の予定を削除してください。');
                      return;
                    }

                    try {
                      // 一時プリセットを作成（説明を含む）
                      const tempPreset = createTempPreset(compositeSchedules, representativeScheduleIndex, compositeDescription);
                      
                      const currentApiUrl = getApiUrl();
                      
                      // 詳細情報をJSON形式で準備
                      const compositeDetails = {
                        description: compositeDescription || `${compositeSchedules.length}個の予定を組み合わせた複合予定`,
                        schedules: compositeSchedules.map(schedule => ({
                          status: schedule.status,
                          startTime: schedule.startTime,
                          endTime: schedule.endTime,
                          memo: schedule.memo || ''
                        }))
                      };

                      const pendingData = {
                        staffId: selectedCell.staffId,
                        date: selectedCell.dateString,
                        status: tempPreset.status,
                        start: tempPreset.start,
                        end: tempPreset.end,
                        memo: `月次計画: ${tempPreset.label}|presetId:${tempPreset.id}|details:${JSON.stringify(compositeDetails)}`,
                        pendingType: 'monthly-planner' as const
                      };

                      const response = await fetch(`${currentApiUrl}/api/schedules/pending`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json' 
                        },
                        body: JSON.stringify(pendingData)
                      });

                      if (response.ok) {
                        alert(`${tempPreset.label}のPending予定を作成しました（承認待ち）`);
                        await fetchPendingSchedules();
                        
                        // データ更新後、保存した位置に復元
                        const restoreScroll = () => {
                          // window全体の横スクロール復元
                          if (savedScrollPosition.x > 0) {
                            window.scrollTo(savedScrollPosition.x, savedScrollPosition.y || 0);
                          } else if (savedScrollPosition.y >= 0) {
                            window.scrollTo(0, savedScrollPosition.y);
                          }
                          
                          // 内部要素の横スクロール復元（念のため）
                          if (topScrollRef.current && headerScrollRef.current && bottomScrollRef.current && savedScrollPosition.x > 0) {
                            topScrollRef.current.scrollLeft = savedScrollPosition.x;
                            headerScrollRef.current.scrollLeft = savedScrollPosition.x;
                            bottomScrollRef.current.scrollLeft = savedScrollPosition.x;
                          }
                        };
                        
                        // 複数回復元を試行（DOM更新タイミングの違いに対応）
                        setTimeout(restoreScroll, 50);
                        setTimeout(restoreScroll, 200);
                        setTimeout(restoreScroll, 500);
                        
                        // モーダルを閉じる
                        setShowCustomCompositeModal(false);
                        setShowModal(false);
                        setSelectedCellForHighlight(null);
                        setCompositeSchedules([{
                          status: 'online',
                          startTime: 9,
                          endTime: 18,
                          memo: ''
                        }]);
                        setRepresentativeScheduleIndex(0);
                        setCompositeValidationErrors([]);
                        setCompositeDescription('');
                      } else {
                        const errorData = await response.json();
                        alert(`カスタム複合予定の作成に失敗しました: ${errorData.message || '不明なエラー'}`);
                      }
                    } catch (error) {
                      console.error('Failed to create custom composite schedule:', error);
                      alert('カスタム複合予定の作成に失敗しました');
                    }
                  }}
                  disabled={compositeValidationErrors.length > 0}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  申請する
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
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
            const details = getPresetDetailsExtended(hoveredPreset);
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

      {/* Pending予定詳細ポップアップ */}
      {hoveredPending && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[60] bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-sm"
          style={{
            left: `${pendingHoverPosition.x}px`,
            top: `${pendingHoverPosition.y}px`
          }}
        >
          {(() => {
            const hoveredPendingData = pendingSchedules.find(p => p.id === hoveredPending);
            if (!hoveredPendingData) return <div className="text-xs text-gray-500">予定情報なし</div>;
            
            const details = getPendingDetails(hoveredPendingData);
            const isApproved = details.approvedAt;
            const isRejected = details.rejectedAt;
            
            return (
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">
                  {details.isComposite ? '詳細内訳' : '予定詳細'}
                </div>
                
                {/* 複合予定の場合：全スケジュール表示 */}
                {details.isComposite && details.presetDetails ? (
                  <div className="mb-3">
                    {/* 複合予定の説明 */}
                    {details.compositeDescription && (
                      <div className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">説明:</span>
                        <span className="ml-1">{details.compositeDescription}</span>
                      </div>
                    )}
                    
                    {/* スケジュール詳細 */}
                    <div className="space-y-1">
                      {details.presetDetails.map((schedule, index) => (
                        <div key={index} className="flex items-center text-xs">
                          <div 
                            className="w-3 h-3 rounded mr-2" 
                            style={{ backgroundColor: getEffectiveStatusColor(schedule.status) }} 
                          />
                          <span>
                            {String(schedule.startTime).padStart(2, '0')}:00-{String(schedule.endTime).padStart(2, '0')}:00
                          </span>
                          <span className="ml-2">{capitalizeStatus(schedule.status)}</span>
                          {schedule.memo && <span className="ml-1">({schedule.memo})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* 単一予定の場合：既存表示 */
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-xs">
                      <div
                        className="w-3 h-3 rounded mr-2"
                        style={{ backgroundColor: getEffectiveStatusColor(details.status) }}
                      />
                      <span className="font-medium text-gray-700">
                        {capitalizeStatus(details.status)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">時間:</span>
                      <span className="ml-1">
                        {String(details.startTime).padStart(2, '0')}:00-{String(details.endTime).padStart(2, '0')}:00
                      </span>
                    </div>
                    
                    {details.memo && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">メモ:</span>
                        <span className="ml-1">{details.memo}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 承認状況表示 */}
                <div className="border-t border-gray-100 pt-2 mb-2">
                  <div className="flex items-center text-xs">
                    {isApproved && <span className="text-green-600 font-medium">✓ 承認済み</span>}
                    {isRejected && <span className="text-red-600 font-medium">✗ 却下済み</span>}
                    {!isApproved && !isRejected && <span className="text-orange-600 font-medium">⏳ 申請中</span>}
                  </div>
                </div>
                
                {/* 承認情報 */}
                {(isApproved || isRejected) && (
                  <div className="border-t border-gray-100 pt-2 space-y-1">
                    {isApproved && details.approvedBy && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">承認者:</span>
                        <span className="ml-1">
                          {typeof details.approvedBy === 'object' && details.approvedBy?.name 
                            ? details.approvedBy.name 
                            : String(details.approvedBy)}
                        </span>
                      </div>
                    )}
                    {isRejected && details.rejectionReason && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">却下理由:</span>
                        <span className="ml-1">{details.rejectionReason}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      {isApproved && details.approvedAt && (
                        <span>承認日時: {new Date(details.approvedAt).toLocaleString('ja-JP')}</span>
                      )}
                      {isRejected && details.rejectedAt && (
                        <span>却下日時: {new Date(details.rejectedAt).toLocaleString('ja-JP')}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 申請情報 */}
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <div className="text-xs text-gray-400">
                    申請ID: {details.id}
                  </div>
                  <div className="text-xs text-gray-400">
                    申請日時: {new Date(details.createdAt).toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>,
        document.body
      )}

      {/* 担当設定モーダル */}
      {showResponsibilityModal && selectedCellForResponsibility && typeof window !== 'undefined' && createPortal(
        <ResponsibilityModal
          isOpen={showResponsibilityModal}
          onClose={() => {
            setShowResponsibilityModal(false);
            setSelectedCellForResponsibility(null);
          }}
          staff={{
            id: selectedCellForResponsibility.staffId,
            name: selectedCellForResponsibility.staffName,
            department: selectedCellForResponsibility.department,
            group: selectedCellForResponsibility.group
          }}
          selectedDate={new Date(selectedCellForResponsibility.dateString)}
          onSave={async (data: UnifiedResponsibilityData) => {
            const success = await saveResponsibility(
              selectedCellForResponsibility.staffId,
              selectedCellForResponsibility.dateString,
              data
            );
            if (success) {
              alert('担当設定を保存しました');
            } else {
              alert('担当設定の保存に失敗しました');
            }
            setShowResponsibilityModal(false);
            setSelectedCellForResponsibility(null);
          }}
          existingData={getResponsibilityForDate(
            selectedCellForResponsibility.staffId,
            new Date(selectedCellForResponsibility.dateString)
          )}
        />,
        document.body
      )}

      {/* 承認モーダル */}
      {showApprovalModal && selectedPendingForApproval && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">予定の承認・却下</h2>
              
              {/* 予定情報 */}
              <div className="bg-gray-50 p-4 rounded-md mb-4 text-left">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>スタッフ:</strong> {selectedPendingForApproval.staffName}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>日付:</strong> {new Date(selectedPendingForApproval.date).toLocaleDateString('ja-JP')}
                </div>
                
                {(() => {
                  const details = getPendingDetails(selectedPendingForApproval);
                  
                  if (details.isComposite && details.presetDetails) {
                    return (
                      <>
                        {/* 複合予定の説明 */}
                        {details.compositeDescription && (
                          <div className="text-sm text-gray-600 mb-3">
                            <strong>複合予定の説明:</strong> {details.compositeDescription}
                          </div>
                        )}
                        
                        {/* 複合予定の詳細内訳 */}
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>詳細内訳:</strong>
                        </div>
                        <div className="ml-4 space-y-1 mb-2">
                          {details.presetDetails.map((schedule, index) => (
                            <div key={index} className="text-xs text-gray-700 flex items-center">
                              <div 
                                className="w-3 h-3 rounded mr-2" 
                                style={{ backgroundColor: getEffectiveStatusColor(schedule.status) }} 
                              />
                              <span>
                                {String(schedule.startTime).padStart(2, '0')}:00-{String(schedule.endTime).padStart(2, '0')}:00
                              </span>
                              <span className="ml-2">{capitalizeStatus(schedule.status)}</span>
                              {schedule.memo && <span className="ml-1 text-gray-500">({schedule.memo})</span>}
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>時間:</strong> {String(selectedPendingForApproval.start).padStart(2, '0')}:00 - {String(selectedPendingForApproval.end).padStart(2, '0')}:00
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>ステータス:</strong> {capitalizeStatus(selectedPendingForApproval.status)}
                        </div>
                        {selectedPendingForApproval.memo && (
                          <div className="text-sm text-gray-600">
                            <strong>メモ:</strong> {selectedPendingForApproval.memo}
                          </div>
                        )}
                      </>
                    );
                  }
                })()}
              </div>

              {/* 却下理由入力 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  却下理由（却下の場合は必須）
                </label>
                <textarea
                  id="rejectionReason"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="却下する場合は理由を入力してください"
                />
              </div>

              {/* ボタン */}
              <div className="flex space-x-3">
                <button
                  onClick={() => handleApprove()}
                  className="flex-1 px-4 h-7 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
                >
                  承認
                </button>
                <button
                  onClick={() => {
                    const textarea = document.getElementById('rejectionReason') as HTMLTextAreaElement;
                    handleReject(textarea.value);
                  }}
                  className="flex-1 px-4 h-7 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
                >
                  却下
                </button>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedPendingForApproval(null);
                  }}
                  className="flex-1 px-4 h-7 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 flex items-center"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 却下済み予定モーダル */}
      {showRejectedModal && selectedRejectedPending && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">却下された予定</h2>
              
              {/* 予定情報 */}
              <div className="bg-gray-50 p-4 rounded-md mb-4 text-left">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>スタッフ:</strong> {selectedRejectedPending.staffName}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>日付:</strong> {new Date(selectedRejectedPending.date).toLocaleDateString('ja-JP')}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>時間:</strong> {String(selectedRejectedPending.start).padStart(2, '0')}:00 - {String(selectedRejectedPending.end).padStart(2, '0')}:00
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>ステータス:</strong> {capitalizeStatus(selectedRejectedPending.status)}
                </div>
                {selectedRejectedPending.memo && (
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>メモ:</strong> {selectedRejectedPending.memo}
                  </div>
                )}
                <div className="text-sm text-gray-600 mb-2">
                  <strong>却下日時:</strong> {selectedRejectedPending.rejectedAt ? new Date(selectedRejectedPending.rejectedAt).toLocaleString('ja-JP') : '-'}
                </div>
                {selectedRejectedPending.rejectionReason && (
                  <div className="text-sm text-red-600">
                    <strong>却下理由:</strong> {selectedRejectedPending.rejectionReason}
                  </div>
                )}
              </div>

              {/* ボタン */}
              <div className="flex space-x-3">
                <button
                  onClick={handleClearRejected}
                  className="flex-1 px-4 h-7 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
                >
                  予定を削除
                </button>
                <button
                  onClick={() => {
                    setShowRejectedModal(false);
                    setSelectedRejectedPending(null);
                  }}
                  className="flex-1 px-4 h-7 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 flex items-center"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 承認済み予定削除モーダル */}
      {showApprovedDeleteModal && selectedApprovedPending && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">承認済み予定の削除</h3>
              
              {/* 予定詳細 */}
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>スタッフ:</strong> {selectedApprovedPending.staffName || 'Unknown'}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>日付:</strong> {selectedApprovedPending.date}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>時間:</strong> {String(selectedApprovedPending.start).padStart(2, '0')}:00 - {String(selectedApprovedPending.end).padStart(2, '0')}:00
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>ステータス:</strong> {capitalizeStatus(selectedApprovedPending.status)}
                </div>
                {selectedApprovedPending.memo && (
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>メモ:</strong> {selectedApprovedPending.memo}
                  </div>
                )}
                <div className="text-sm text-green-600">
                  <strong>承認日時:</strong> {selectedApprovedPending.approvedAt ? new Date(selectedApprovedPending.approvedAt).toLocaleString('ja-JP') : '-'}
                </div>
              </div>

              {/* 削除理由入力 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  削除理由 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={unapprovalReason}
                  onChange={(e) => setUnapprovalReason(e.target.value)}
                  placeholder="承認を取り消す理由を入力してください"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              {/* ボタン */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (unapprovalReason.trim()) {
                      handleUnapproveSchedule(unapprovalReason.trim());
                    } else {
                      alert('削除理由を入力してください');
                    }
                  }}
                  className="flex-1 px-4 h-7 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
                  disabled={!unapprovalReason.trim()}
                >
                  承認を取り消す
                </button>
                <button
                  onClick={() => {
                    setShowApprovedDeleteModal(false);
                    setSelectedApprovedPending(null);
                    setUnapprovalReason('');
                  }}
                  className="flex-1 px-4 h-7 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 flex items-center"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 編集モーダル */}
      {showEditModal && selectedPendingForEdit && (
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">未承認予定の編集</h2>
                
                {/* 現在の予定情報 */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">現在の予定</h3>
                  <div className="text-sm text-gray-600">
                    <p>スタッフ: {selectedPendingForEdit.staffName}</p>
                    <p>日付: {selectedPendingForEdit.date}</p>
                    <p>ステータス: {capitalizeStatus(selectedPendingForEdit.status)}</p>
                    <p>時間: {selectedPendingForEdit.start}:00 - {selectedPendingForEdit.end}:00</p>
                    <p>メモ: {selectedPendingForEdit.memo}</p>
                  </div>
                </div>

                {/* プリセット選択 */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3">新しい予定を選択</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {monthlyPlannerPresets.map((preset) => (
                      <button
                        key={preset.key}
                        onClick={() => handleEditUpdate(preset)}
                        className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                        style={{ 
                          borderColor: getEffectiveStatusColor(preset.status),
                          backgroundColor: `${getEffectiveStatusColor(preset.status)}20`
                        }}
                      >
                        <div className="font-medium" style={{ color: getEffectiveStatusColor(preset.status) }}>
                          {preset.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          {preset.start}:00 - {preset.end}:00
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex gap-3">
                  <button
                    onClick={handleEditDelete}
                    className="flex-1 px-4 h-7 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
                  >
                    クリア（削除）
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedPendingForEdit(null);
                    }}
                    className="flex-1 px-4 h-7 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 flex items-center"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* 統一設定モーダル */}
      <UnifiedSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSettingsChange={handleSettingsChange}
        setIsCsvUploadModalOpen={setIsCsvUploadModalOpen}
        setIsJsonUploadModalOpen={setIsJsonUploadModalOpen}
        setIsImportHistoryModalOpen={setIsImportHistoryModalOpen}
        authenticatedFetch={authenticatedFetch}
        staffList={staffList}
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
    </div>
  );
}


// メインコンポーネント
export default function MonthlyPlannerPage() {
  return (
    <AuthGuard>
      <MonthlyPlannerPageContent />
    </AuthGuard>
  );
}
