'use client';

import { useState, useEffect, useMemo, useCallback, Fragment, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// ★★★ カレンダーライブラリをインポート ★★★
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import "react-datepicker/dist/react-datepicker.css";

// ★★★ カレンダーの表示言語を日本語に設定 ★★★
registerLocale('ja', ja);


// --- 型定義 ---
declare global {
  interface Window {
    APP_CONFIG?: {
      API_HOST: string;
    };
  }
}

type Staff = {
  id: number;
  name: string;
  department: string;
  group: string;
  currentStatus: string;
  isSupporting?: boolean;
  originalDept?: string;
  originalGroup?: string;
  currentDept?: string;
  currentGroup?: string;
  supportInfo?: {
    startDate: string;
    endDate: string;
    reason: string;
  } | null;
  responsibilities?: ResponsibilityData | null;
  hasResponsibilities?: boolean;
  isReception?: boolean;
};

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

type ScheduleFromDB = {
  id: number;
  staffId: number;
  status: string;
  start: string;
  end: string;
  memo?: string;
  layer?: 'contract' | 'adjustment';
};

type Schedule = {
  id: number;
  staffId: number;
  status: string;
  start: number;
  end: number;
  memo?: string;
  layer?: 'contract' | 'adjustment';
};

type DragInfo = {
  staff: Staff;
  startX: number;
  currentX: number;
  rowRef: HTMLDivElement;
};

type ImportHistory = {
  batchId: string;
  importedAt: string;
  recordCount: number;
  staffCount: number;
  staffList: string[];
  dateRange: string;
  canRollback: boolean;
};

// --- 定数定義 ---
const statusColors: { [key: string]: string } = {
  'Online': '#22c55e', 'Remote': '#10b981', 'Meeting': '#f59e0b', 'Training': '#3b82f6',
  'Break': '#f97316', 'Off': '#ef4444', 'Unplanned': '#dc2626', 'Night Duty': '#4f46e5',
};

// 部署の色設定（より薄く調整）
const departmentColors: { [key: string]: string } = {
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
const teamColors: { [key: string]: string } = {
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
const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.APP_CONFIG) {
    return window.APP_CONFIG.API_HOST;
  }
  // フォールバック（サーバーサイドレンダリング時など）
  return 'http://localhost:3002';
};
const availableStatuses = ['Online', 'Remote', 'Meeting', 'Training', 'Break', 'Off', 'Unplanned', 'Night Duty'];
const AVAILABLE_STATUSES = ['Online', 'Remote', 'Night Duty'];

// --- 文字チェック関数 ---
type CharacterCheckResult = {
  isValid: boolean;
  errors: Array<{
    field: string;
    value: string;
    invalidChars: string[];
    position: number;
  }>;
};

const checkSupportedCharacters = (data: Array<{name: string; dept: string; team: string}>): CharacterCheckResult => {
  // JIS第1-2水準漢字 + ひらがな + カタカナ + 英数字 + 基本記号 + 反復記号「々」+ 全角英数字の範囲
  const supportedCharsRegex = /^[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\u0020-\u007e\uff01-\uff9f\u3000\u301c\u2010-\u2015\u2018-\u201f\u2026\u2030\u203b\u2212\u2500-\u257f\u3005]*$/;
  
  const errors: CharacterCheckResult['errors'] = [];
  
  data.forEach((item, index) => {
    // 名前をチェック
    if (!supportedCharsRegex.test(item.name)) {
      const invalidChars = Array.from(item.name).filter(char => !supportedCharsRegex.test(char));
      errors.push({
        field: 'name',
        value: item.name,
        invalidChars: Array.from(new Set(invalidChars)),
        position: index + 1
      });
    }
    
    // 部署をチェック
    if (!supportedCharsRegex.test(item.dept)) {
      const invalidChars = Array.from(item.dept).filter(char => !supportedCharsRegex.test(char));
      errors.push({
        field: 'dept',
        value: item.dept,
        invalidChars: Array.from(new Set(invalidChars)),
        position: index + 1
      });
    }
    
    // チーム/グループをチェック
    if (!supportedCharsRegex.test(item.team)) {
      const invalidChars = Array.from(item.team).filter(char => !supportedCharsRegex.test(char));
      errors.push({
        field: 'team',
        value: item.team,
        invalidChars: Array.from(new Set(invalidChars)),
        position: index + 1
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// --- 15分単位の正確な時間位置計算（4マス=1時間） ---
const timeToPositionPercent = (time: number): number => {
    // 15分単位に丸める
    const roundedTime = Math.round(time * 4) / 4;
    
    const START_TIME = 8; // 8:00
    const END_TIME = 21; // 21:00
    const TOTAL_QUARTERS = (END_TIME - START_TIME) * 4; // 13時間 × 4 = 52マス
    
    // 8:00からの15分単位数を計算
    const quartersFromStart = (roundedTime - START_TIME) * 4;
    
    // 0%-100%に変換
    return Math.max(0, Math.min(100, (quartersFromStart / TOTAL_QUARTERS) * 100));
};

const positionPercentToTime = (percent: number): number => {
    const START_TIME = 8; // 8:00
    const END_TIME = 21; // 21:00
    const TOTAL_QUARTERS = (END_TIME - START_TIME) * 4; // 52マス
    
    // 0%-100%を15分単位数に変換
    const quartersFromStart = (percent / 100) * TOTAL_QUARTERS;
    
    // 15分単位数を時間に変換
    const time = START_TIME + quartersFromStart / 4;
    
    // 15分単位に丸める
    return Math.round(time * 4) / 4;
}

// --- 時刻変換ヘルパー関数 ---
const timeStringToHours = (timeString: string): number => {
    // ISO文字列（例: "2025-06-21T10:30:00.000Z"）を日本時間の数値時刻に変換
    const date = new Date(timeString);
    // 日本時間に変換（UTC + 9時間）
    const jstHours = date.getUTCHours() + 9;
    const minutes = date.getUTCMinutes();
    // 24時間を超える場合の調整（日付境界の処理）
    const adjustedHours = jstHours >= 24 ? jstHours - 24 : jstHours;
    return adjustedHours + minutes / 60;
};

const hoursToTimeString = (hours: number): string => {
    // 数値時刻（例: 10.5）をISO文字列に変換
    const hour = Math.floor(hours);
    const minute = Math.round((hours - hour) * 60);
    
    // 現在の日付を取得してJST時刻として設定
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    
    // JST時刻でDateオブジェクトを作成し、UTCに変換
    const jstDate = new Date(year, month, day, hour, minute, 0, 0);
    // JST → UTC変換（-9時間）
    const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
    
    return utcDate.toISOString();
};

// --- 時間選択肢を生成するヘルパー関数 ---
const generateTimeOptions = (startHour: number, endHour: number) => {
    const options = [];
    
    // 8:00から15分刻みで追加
    for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += 15) {
            const timeValue = h + m / 60;
            const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            options.push({ value: timeValue, label: timeLabel });
        }
    }
    options.push({ value: endHour, label: `${endHour}:00`});
    return options;
};

// --- 登録・編集モーダル ---
const ScheduleModal = ({ isOpen, onClose, staffList, onSave, scheduleToEdit, initialData }: { 
    isOpen: boolean; 
    onClose: () => void; 
    staffList: Staff[]; 
    onSave: (data: any) => void;
    scheduleToEdit: Schedule | null;
    initialData?: Partial<Schedule>;
}) => {
  const isEditMode = !!scheduleToEdit;
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState('Online');
  const [startTime, setStartTime] = useState('8');
  const [endTime, setEndTime] = useState('8.25');
  const [memo, setMemo] = useState('');
  const timeOptions = useMemo(() => generateTimeOptions(8, 21), []);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    const data = scheduleToEdit || initialData;
    if (isOpen && data) {
        setStaffId(data.staffId?.toString() || '');
        setStatus(data.status || 'Online');
        setStartTime(data.start?.toString() || '8');
        setEndTime(data.end?.toString() || '8.25');
        setMemo(data.memo || '');
    } else if (!isOpen) {
        setStaffId(''); setStatus('Online'); setStartTime('8'); setEndTime('8.25'); setMemo('');
    }
  }, [scheduleToEdit, initialData, isOpen]);

  if (!isOpen || !isClient) return null;

  const handleSave = () => {
    if (!staffId || parseFloat(startTime) >= parseFloat(endTime)) { console.error("入力内容が正しくありません。"); return; }
    const scheduleData = { 
      staffId: parseInt(staffId), 
      status, 
      start: parseFloat(startTime), 
      end: parseFloat(endTime),
      memo: (status === 'Meeting' || status === 'Training') ? memo : undefined
    };
    onSave(isEditMode ? { ...scheduleData, id: scheduleToEdit.id } : scheduleData);
    onClose();
  };
  
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{isEditMode ? '予定を編集' : '予定を追加'}</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="staff" className="block text-sm font-medium text-gray-700">スタッフ</label>
            <select id="staff" value={staffId} onChange={e => setStaffId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" disabled={isEditMode || !!initialData?.staffId}>
              <option value="" disabled>選択してください</option>
              {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">ステータス</label>
            <select id="status" value={status} onChange={e => setStatus(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="block text-sm font-medium text-gray-700">開始</label>
              <select id="start" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">{timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
            </div>
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-700">終了</label>
              <select id="end" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">{timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
            </div>
          </div>
          {(status === 'Meeting' || status === 'Training') && (
            <div>
              <label htmlFor="memo" className="block text-sm font-medium text-gray-700">
                メモ ({status === 'Meeting' ? '会議' : '研修'}内容)
              </label>
              <textarea
                id="memo"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
                placeholder={status === 'Meeting' ? '会議の内容を入力...' : '研修の内容を入力...'}
              />
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border-transparent rounded-md hover:bg-indigo-700">保存</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- 削除確認モーダル ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; message: string; }) => {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);
    if (!isOpen || !isClient) return null;
    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center">
            <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm">
                <h3 className="text-lg font-medium leading-6 text-gray-900">確認</h3>
                <div className="mt-2"><p className="text-sm text-gray-500">{message}</p></div>
                <div className="mt-6 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
                    <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">削除</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- 支援設定モーダルコンポーネント ---
const AssignmentModal = ({ isOpen, onClose, staff, staffList, onSave, onDelete }: {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  staffList: Staff[];
  onSave: (data: {
    staffId: number;
    startDate: string;
    endDate: string;
    department: string;
    group: string;
  }) => void;
  onDelete?: (staffId: number) => void;
}) => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [department, setDepartment] = useState('');
  const [group, setGroup] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 既存の支援設定がある場合は初期値として設定
  useEffect(() => {
    if (isOpen && staff) {
      if (staff.supportInfo) {
        setStartDate(new Date(staff.supportInfo.startDate));
        setEndDate(new Date(staff.supportInfo.endDate));
        setDepartment(staff.currentDept || '');
        setGroup(staff.currentGroup || '');
      } else {
        // 新規の場合は今日から開始
        const today = new Date();
        setStartDate(today);
        setEndDate(today);
        setDepartment('');
        setGroup('');
      }
    } else if (!isOpen) {
      setStartDate(null);
      setEndDate(null);
      setDepartment('');
      setGroup('');
    }
  }, [isOpen, staff]);

  // 利用可能な部署とグループを取得（「受付」を含むものは除外）
  const availableDepartments = useMemo(() => {
    return Array.from(new Set(staffList.map(s => s.department)))
      .filter(dept => !dept.includes('受付'));
  }, [staffList]);

  const availableGroups = useMemo(() => {
    if (!department) return [];
    return Array.from(new Set(staffList.filter(s => s.department === department).map(s => s.group)))
      .filter(group => !group.includes('受付'));
  }, [staffList, department]);

  // 部署が変更されたらグループをリセット
  useEffect(() => {
    if (department && !availableGroups.includes(group)) {
      setGroup('');
    }
  }, [department, availableGroups, group]);

  if (!isOpen || !isClient || !staff) return null;

  const handleSave = () => {
    if (!startDate || !endDate || !department || !group) {
      alert('すべての項目を入力してください。');
      return;
    }

    if (startDate > endDate) {
      alert('開始日は終了日より前の日付を選択してください。');
      return;
    }

    onSave({
      staffId: staff.id,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      department,
      group,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!staff || !onDelete) return;
    
    if (confirm(`${staff.name}の支援設定を削除しますか？`)) {
      onDelete(staff.id);
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          {staff.supportInfo ? '支援設定を編集' : '支援を設定'} - {staff.name}
        </h3>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">開始日</label>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                locale="ja"
                dateFormat="yyyy年M月d日(E)"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholderText="開始日を選択"
                popperClassName="!z-[10000]"
                popperPlacement="bottom-start"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">終了日</label>
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                locale="ja"
                dateFormat="yyyy年M月d日(E)"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholderText="終了日を選択"
                popperClassName="!z-[10000]"
                popperPlacement="bottom-start"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">支援先部署</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">選択してください</option>
              {availableDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">支援先グループ</label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              disabled={!department}
            >
              <option value="">選択してください</option>
              {availableGroups.map(grp => (
                <option key={grp} value={grp}>{grp}</option>
              ))}
            </select>
          </div>
          {staff.supportInfo && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                現在の支援先: {staff.currentDept} / {staff.currentGroup}
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-between items-center">
          {/* 削除ボタン（左側、既存の支援設定がある場合のみ表示） */}
          <div>
            {staff.isSupporting && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                支援設定を削除
              </button>
            )}
          </div>
          
          {/* キャンセル・保存ボタン（右側） */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- 担当設定モーダルコンポーネント ---
const ResponsibilityModal = ({ isOpen, onClose, staff, onSave }: {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  onSave: (data: { staffId: number; responsibilities: ResponsibilityData }) => void;
}) => {
  const [isClient, setIsClient] = useState(false);
  
  // 一般部署用のstate
  const [fax, setFax] = useState(false);
  const [subjectCheck, setSubjectCheck] = useState(false);
  const [custom, setCustom] = useState('');
  
  // 受付部署用のstate
  const [lunch, setLunch] = useState(false);
  const [cs, setCs] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (isOpen && staff) {
      // 既存の担当設定があれば読み込み
      if (staff.responsibilities) {
        if (staff.isReception) {
          const r = staff.responsibilities as ReceptionResponsibilityData;
          setLunch(r.lunch || false);
          setFax(r.fax || false);
          setCs(r.cs || false);
          setCustom(r.custom || '');
        } else {
          const r = staff.responsibilities as GeneralResponsibilityData;
          setFax(r.fax || false);
          setSubjectCheck(r.subjectCheck || false);
          setCustom(r.custom || '');
        }
      } else {
        // 新規設定の場合は全て初期化
        setLunch(false);
        setFax(false);
        setCs(false);
        setSubjectCheck(false);
        setCustom('');
      }
    } else if (!isOpen) {
      // モーダルが閉じられた時は全て初期化
      setLunch(false);
      setFax(false);
      setCs(false);
      setSubjectCheck(false);
      setCustom('');
    }
  }, [isOpen, staff]);

  if (!isOpen || !staff || !isClient) return null;

  const handleSave = () => {
    const responsibilities: ResponsibilityData = staff.isReception 
      ? { lunch, fax, cs, custom }
      : { fax, subjectCheck, custom };

    onSave({
      staffId: staff.id,
      responsibilities
    });
    onClose();
  };

  const handleClear = () => {
    if (confirm(`${staff.name}の担当設定をクリアしますか？`)) {
      const responsibilities: ResponsibilityData = staff.isReception 
        ? { lunch: false, fax: false, cs: false, custom: '' }
        : { fax: false, subjectCheck: false, custom: '' };

      onSave({
        staffId: staff.id,
        responsibilities
      });
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            担当設定 - {staff.name}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {staff.department} / {staff.group}
          </p>
        </div>
        
        <div className="px-6 py-4 space-y-4">
          {staff.isReception ? (
            // 受付部署用
            <>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="lunch"
                  checked={lunch}
                  onChange={(e) => setLunch(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="lunch" className="ml-2 text-sm font-medium text-gray-700">
                  昼当番
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fax"
                  checked={fax}
                  onChange={(e) => setFax(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="fax" className="ml-2 text-sm font-medium text-gray-700">
                  FAX当番
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="cs"
                  checked={cs}
                  onChange={(e) => setCs(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="cs" className="ml-2 text-sm font-medium text-gray-700">
                  CS担当
                </label>
              </div>
            </>
          ) : (
            // 一般部署用
            <>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fax"
                  checked={fax}
                  onChange={(e) => setFax(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="fax" className="ml-2 text-sm font-medium text-gray-700">
                  FAX当番
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="subjectCheck"
                  checked={subjectCheck}
                  onChange={(e) => setSubjectCheck(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="subjectCheck" className="ml-2 text-sm font-medium text-gray-700">
                  件名チェック担当
                </label>
              </div>
            </>
          )}
          
          {/* カスタム担当 */}
          <div>
            <label htmlFor="custom" className="block text-sm font-medium text-gray-700">
              カスタム担当
            </label>
            <input
              type="text"
              id="custom"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="カスタム担当を入力"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 flex justify-between">
          {/* クリアボタン（左側） */}
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
          >
            クリア
          </button>
          
          {/* キャンセル・保存ボタン（右側） */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- JSONファイルアップロードモーダルコンポーネント ---
const JsonUploadModal = ({ isOpen, onClose, onUpload }: {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isOpen || !isClient) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
    } else {
      alert('JSONファイルを選択してください');
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      alert('ファイルを選択してください');
      return;
    }

    if (selectedFile.type !== 'application/json') {
      alert('JSONファイルを選択してください');
      return;
    }

    onUpload(selectedFile);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">スタッフデータ同期（JSON）</h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            指定フォーマットのJSONファイルをアップロードして社員情報を一括投入します。
          </p>
          <p className="text-xs text-gray-500 mb-3">
            フォーマット：{"{"} "employeeData": [{"{"} "name": "名前", "dept": "部署", "team": "グループ" {"}"}] {"}"}
          </p>
        </div>

        <div 
          className={`mb-4 border-2 border-dashed rounded-lg p-8 text-center ${
            isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">サイズ: {(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                JSONファイルをドラッグ&ドロップするか、クリックして選択
              </p>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
                id="jsonFile"
              />
              <label
                htmlFor="jsonFile"
                className="inline-block px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 cursor-pointer"
              >
                ファイルを選択
              </label>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>注意:</strong> アップロードにより、既存のスタッフデータが更新・削除される場合があります。
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300"
          >
            キャンセル
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
              selectedFile 
                ? 'bg-indigo-600 hover:bg-indigo-700' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            同期実行
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- CSVファイルアップロードモーダルコンポーネント ---
const CsvUploadModal = ({ isOpen, onClose, onUpload }: {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.endsWith('.csv') || file.type === 'text/csv');
    if (csvFile) {
      setSelectedFile(csvFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      alert('ファイルを選択してください。');
      return;
    }

    onUpload(selectedFile);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">スケジュールインポート（CSV）</h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            指定フォーマットのCSVファイルをアップロードしてスケジュールデータを一括投入します。
          </p>
          <p className="text-xs text-gray-500 mb-3">
            フォーマット: 日付,社員名,ステータス,開始時刻,終了時刻,メモ
          </p>
        </div>

        <div 
          className={`mb-4 border-2 border-dashed rounded-lg p-8 text-center ${
            isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">サイズ: {(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                CSVファイルをドラッグ&ドロップするか、クリックして選択
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csvFile"
              />
              <label
                htmlFor="csvFile"
                className="inline-block px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 cursor-pointer"
              >
                ファイルを選択
              </label>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>注意:</strong> アップロードにより、既存のスケジュールデータが更新される場合があります。
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300"
          >
            キャンセル
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
              selectedFile 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            インポート実行
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- インポート履歴モーダルコンポーネント ---
const ImportHistoryModal = ({ isOpen, onClose, onRollback }: {
  isOpen: boolean;
  onClose: () => void;
  onRollback: (batchId: string) => void;
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
      const response = await fetch(`${currentApiUrl}/api/csv-import/history`);
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
  }, [isOpen]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                          {history.staffList.slice(0, 5).join(', ')}
                          {history.staffList.length > 5 && ` 他${history.staffList.length - 5}名`}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {history.canRollback ? (
                        <button
                          onClick={() => handleRollback(history.batchId, history.recordCount)}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                        >
                          ロールバック
                        </button>
                      ) : (
                        <div className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md text-sm font-medium cursor-not-allowed">
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
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
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

// --- 設定モーダルコンポーネント ---
const SettingsModal = ({ isOpen, onClose }: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState('import');

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">⚙️ 設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        {/* タブナビゲーション */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button 
              onClick={() => setActiveTab('import')} 
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'import' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📥 インポート
            </button>
            <button 
              onClick={() => setActiveTab('display')} 
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'display' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🎨 表示設定
            </button>
            <button 
              onClick={() => setActiveTab('export')} 
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'export' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📤 エクスポート
            </button>
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">📋 データインポート</h3>
                
                {/* CSVスケジュールインポート */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">📅 スケジュールインポート</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        CSVファイルから月次スケジュールを一括インポート
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsCsvUploadModalOpen(true);
                        onClose();
                      }} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      インポート実行
                    </button>
                  </div>
                </div>

                {/* 社員情報インポート */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-900">👥 社員情報インポート</h4>
                      <p className="text-sm text-green-700 mt-1">
                        JSONファイルから社員マスタデータを更新
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsJsonUploadModalOpen(true);
                        onClose();
                      }} 
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      インポート実行
                    </button>
                  </div>
                </div>

                {/* インポート履歴 */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-purple-900">📜 インポート履歴</h4>
                      <p className="text-sm text-purple-700 mt-1">
                        過去のインポート履歴確認・ロールバック実行
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsImportHistoryModalOpen(true);
                        onClose();
                      }} 
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      履歴を確認
                    </button>
                  </div>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-600">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">インポート時の注意</h4>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>大量データのインポートは時間がかかる場合があります</li>
                        <li>インポート前に必ずバックアップを取得してください</li>
                        <li>ロールバックは24時間以内のデータのみ対応</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">🎨 表示設定</h3>
              
              {/* 時間軸設定 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">⏰ 時間軸設定</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="radio" name="timeRange" className="mr-2" defaultChecked />
                    <span>標準（8:00-21:00）</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="timeRange" className="mr-2" />
                    <span>拡張（7:00-22:00）</span>
                  </label>
                </div>
              </div>

              {/* ステータス色設定 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">🎨 ステータス色設定</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(statusColors).map(([status, color]) => (
                    <div key={status} className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
                      <span className="text-sm">{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">📤 データエクスポート</h3>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">📊 レポート出力</h4>
                <div className="space-y-3">
                  <button className="w-full px-4 py-2 text-left border border-gray-300 rounded-md hover:bg-gray-50">
                    📅 月次勤務実績レポート（CSV）
                  </button>
                  <button className="w-full px-4 py-2 text-left border border-gray-300 rounded-md hover:bg-gray-50">
                    📈 部署別集計レポート（Excel）
                  </button>
                  <button className="w-full px-4 py-2 text-left border border-gray-300 rounded-md hover:bg-gray-50">
                    👥 スタッフ一覧（JSON）
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-gray-600">ℹ️</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-800">エクスポート機能について</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      レポート出力機能は今後のアップデートで追加予定です。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- チャートコンポーネント ---
const StatusChart = ({ data, staffList, selectedDepartment, selectedGroup }: { 
  data: any[], 
  staffList: Staff[], 
  selectedDepartment: string, 
  selectedGroup: string 
}) => {
  // 左列のコンテンツを取得してガントチャートと同じ構造を作る
  const groupedStaff = useMemo(() => {
    const filteredStaff = staffList.filter(staff => {
      const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
      const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
      return departmentMatch && groupMatch;
    });

    return filteredStaff.reduce((acc, staff) => {
      const { department, group } = staff;
      if (!acc[department]) { acc[department] = {}; }
      if (!acc[department][group]) { acc[department][group] = []; }
      acc[department][group].push(staff);
      return acc;
    }, {} as Record<string, Record<string, Staff[]>>);
  }, [staffList, selectedDepartment, selectedGroup]);

  return (
    <div className="mb-1 bg-white shadow rounded-lg">
      <div className="flex">
        {/* 左列 - 凡例エリア（2列構成） */}
        <div className="w-48 border-r border-gray-200 bg-gray-50">
          <div className="px-2 py-1 flex gap-x-4">
            {/* 1列目 */}
            <div className="flex flex-col gap-y-1">
              {['Online', 'Remote', 'Night Duty'].map(status => (
                <div key={status} className="flex items-center text-xs">
                  <div 
                    className="w-2 h-2 rounded mr-1 flex-shrink-0" 
                    style={{ backgroundColor: statusColors[status] || '#8884d8' }}
                  ></div>
                  <span className="truncate" style={{ opacity: status === 'Online' ? 1 : 0.7 }}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
            {/* 2列目 */}
            <div className="flex flex-col gap-y-1">
              {['Off', 'Unplanned', 'Break', 'Meeting', 'Training'].map(status => (
                <div key={status} className="flex items-center text-xs">
                  <div 
                    className="w-2 h-2 rounded mr-1 flex-shrink-0" 
                    style={{ backgroundColor: statusColors[status] || '#8884d8' }}
                  ></div>
                  <span className="truncate" style={{ opacity: status === 'Online' ? 1 : 0.7 }}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 右列 - チャート表示エリア */}
        <div className="flex-1 p-1" style={{ height: '120px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 10, left: 5, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 8 }} 
                interval={3}
                angle={-45}
                textAnchor="end"
                height={40}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={25} />
              <Tooltip wrapperStyle={{ zIndex: 100 }} />
              {/* Legendを非表示にする */}
              {/* 凡例と同じ順序で描画 */}
              {['Online', 'Remote', 'Night Duty', 'Off', 'Unplanned', 'Break', 'Meeting', 'Training'].map(status => (
                <Line 
                  key={status} 
                  type="monotone" 
                  dataKey={status} 
                  stroke={statusColors[status] || '#8884d8'} 
                  strokeWidth={2} 
                  connectNulls 
                  dot={false}
                  strokeOpacity={status === 'Online' ? 1 : 0.3}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};



// --- メインのコンポーネント (Home) ---
export default function Home() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSettingFilter, setSelectedSettingFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date());
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [draggedSchedule, setDraggedSchedule] = useState<Partial<Schedule> | null>(null);
  const [isJsonUploadModalOpen, setIsJsonUploadModalOpen] = useState(false);
  const [isCsvUploadModalOpen, setIsCsvUploadModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedStaffForAssignment, setSelectedStaffForAssignment] = useState<Staff | null>(null);
  const [isResponsibilityModalOpen, setIsResponsibilityModalOpen] = useState(false);
  const [selectedStaffForResponsibility, setSelectedStaffForResponsibility] = useState<Staff | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<{ schedule: Schedule; layer: string } | null>(null);
  const [isImportHistoryModalOpen, setIsImportHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // スクロール同期用のref
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  const fetchData = useCallback(async (date: Date) => {
    setIsLoading(true);
    // JST基準の日付文字列を生成（CLAUDE.md厳格ルール準拠）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const currentApiUrl = getApiUrl();
    try {
      console.log('=== fetchData START ===');
      console.log('Fetching data for date:', dateString);
      console.log('API URL:', currentApiUrl);
      
      // スケジュール、支援状況、担当設定を並列で取得
      const [scheduleRes, supportRes, responsibilityRes] = await Promise.all([
        fetch(`${currentApiUrl}/api/schedules/layered?date=${dateString}`),
        fetch(`${currentApiUrl}/api/assignments/status`),
        fetch(`${currentApiUrl}/api/responsibilities/status?date=${dateString}`)
      ]);
      
      console.log('Schedule API response status:', scheduleRes.status);
      console.log('Support API response status:', supportRes.status);
      console.log('Responsibility API response status:', responsibilityRes.status);
      
      if (!scheduleRes.ok) throw new Error(`Schedule API response was not ok`);
      if (!supportRes.ok) throw new Error(`Support API response was not ok`);
      if (!responsibilityRes.ok) throw new Error(`Responsibility API response was not ok`);
      
      const scheduleData: { staff: Staff[], schedules: ScheduleFromDB[] } = await scheduleRes.json();
      const supportData = await supportRes.json();
      const responsibilityData = await responsibilityRes.json();
      
      console.log('Schedule data received:', scheduleData);
      console.log('Support data received:', supportData);
      console.log('Responsibility data received:', responsibilityData);
      
      
      
      // 支援状況と担当設定をスタッフデータにマージ
      const staffWithSupportAndResponsibility = scheduleData.staff.map(staff => {
        const supportInfo = supportData.find((s: any) => s.id === staff.id);
        const responsibilityInfo = responsibilityData.find((r: any) => r.id === staff.id);
        
        let result = { ...staff };
        
        // 支援状況をマージ
        if (supportInfo && supportInfo.isSupporting) {
          result = {
            ...result,
            isSupporting: true,
            originalDept: supportInfo.originalDept,
            originalGroup: supportInfo.originalGroup,
            currentDept: supportInfo.currentDept,
            currentGroup: supportInfo.currentGroup,
            supportInfo: supportInfo.supportInfo
          };
        } else {
          result.isSupporting = false;
        }
        
        // 担当設定をマージ
        if (responsibilityInfo && responsibilityInfo.responsibilities) {
          result.responsibilities = responsibilityInfo.responsibilities;
          // 担当設定が実際に設定されているかチェック
          const responsibilities = responsibilityInfo.responsibilities;
          const hasAnyResponsibility = 
            (responsibilities.fax) ||
            (responsibilities.subjectCheck) ||
            (responsibilities.lunch) ||
            (responsibilities.cs) ||
            (responsibilities.custom && responsibilities.custom.trim() !== '');
          result.hasResponsibilities = hasAnyResponsibility;
        } else {
          result.hasResponsibilities = false;
        }
        
        // 受付部署の判定
        result.isReception = staff.department.includes('受付') || staff.group.includes('受付');
        
        return result;
      });
      
      setStaffList(staffWithSupportAndResponsibility);
      
      // バックエンドからISO文字列で返されるスケジュールを数値時刻に変換
      console.log('Raw schedules from backend:', scheduleData.schedules);
      const convertedSchedules: Schedule[] = scheduleData.schedules.map(s => ({
        id: s.id,
        staffId: s.staffId,
        status: s.status,
        start: timeStringToHours(s.start),
        end: timeStringToHours(s.end),
        memo: s.memo,
        layer: s.layer  // layer情報を保持
      }));
      console.log('Converted schedules:', convertedSchedules);
      setSchedules(convertedSchedules);
      console.log('=== fetchData SUCCESS ===');
    } catch (error) { 
      console.error('=== fetchData ERROR ===');
      console.error('データの取得に失敗しました', error); 
    } 
    finally { setIsLoading(false); }
  }, []);
  
  useEffect(() => {
    fetchData(displayDate);
  }, [displayDate, fetchData]);

  useEffect(() => {
    const currentApiUrl = getApiUrl();
    const socket: Socket = io(currentApiUrl);
    const handleNewSchedule = (newSchedule: ScheduleFromDB) => {
        console.log('=== WebSocket: New Schedule ===');
        console.log('New schedule received:', newSchedule);
        const scheduleDate = new Date(newSchedule.start);
        console.log('Schedule date:', scheduleDate.toISOString().split('T')[0]);
        console.log('Display date:', displayDate.toISOString().split('T')[0]);
        if(scheduleDate.toISOString().split('T')[0] === displayDate.toISOString().split('T')[0]) {
            console.log('Fetching updated data due to new schedule...');
            fetchData(displayDate);
        } else {
            console.log('Schedule not for current display date, ignoring');
        }
    };
    const handleUpdatedSchedule = (updatedSchedule: ScheduleFromDB) => {
        const scheduleDate = new Date(updatedSchedule.start);
        if(scheduleDate.toISOString().split('T')[0] === displayDate.toISOString().split('T')[0]){
            fetchData(displayDate);
        }
    }
    const handleDeletedSchedule = (id: number) => {
        fetchData(displayDate);
    };
    socket.on('schedule:new', handleNewSchedule);
    socket.on('schedule:updated', handleUpdatedSchedule);
    socket.on('schedule:deleted', handleDeletedSchedule);
    return () => { 
        socket.off('schedule:new', handleNewSchedule);
        socket.off('schedule:updated', handleUpdatedSchedule);
        socket.off('schedule:deleted', handleDeletedSchedule);
        socket.disconnect(); 
    };
  }, [displayDate]);
  
  const handleOpenModal = (schedule: Schedule | null = null, initialData: Partial<Schedule> | null = null) => {
    setEditingSchedule(schedule);
    setDraggedSchedule(initialData);
    setIsModalOpen(true);
  };
  
  const handleSaveSchedule = async (scheduleData: Schedule & { id?: number }) => {
    const date = displayDate.toISOString().split('T')[0];
    
    // 案1 + 案4のハイブリッド: 当日作成のOffを自動でUnplannedに変換
    let processedScheduleData = { ...scheduleData };
    const today = new Date().toISOString().split('T')[0];
    
    // 新規作成 かつ 当日 かつ Offステータスの場合、自動でUnplannedに変換
    if (!scheduleData.id && date === today && scheduleData.status === 'Off') {
      processedScheduleData.status = 'Unplanned';
      console.log('当日作成のOffをUnplannedに自動変換しました');
    }
    
    const payload = { ...processedScheduleData, date };
    const currentApiUrl = getApiUrl();
    try {
      console.log('=== handleSaveSchedule START ===');
      console.log('Original scheduleData:', scheduleData);
      console.log('Display date:', date);
      console.log('Final payload:', payload);
      console.log('API URL:', currentApiUrl);
      
      let response;
      if (scheduleData.id) {
        console.log('PATCH request to:', `${currentApiUrl}/api/schedules/${scheduleData.id}`);
        response = await fetch(`${currentApiUrl}/api/schedules/${scheduleData.id}`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
      } else {
        console.log('POST request to:', `${currentApiUrl}/api/schedules`);
        response = await fetch(`${currentApiUrl}/api/schedules`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
      }
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, response.statusText, errorText);
        throw new Error(`スケジュールの保存に失敗しました: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Schedule saved successfully:', result);
      console.log('=== handleSaveSchedule SUCCESS ===');
      
      // データを再取得してUIを更新
      console.log('Fetching updated data...');
      await fetchData(displayDate);
      setIsModalOpen(false);
      setEditingSchedule(null);
      setDraggedSchedule(null);
    } catch (error) {
      console.error('=== handleSaveSchedule ERROR ===');
      console.error('Error details:', error);
      alert('スケジュールの保存に失敗しました。再度お試しください。\n詳細: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  const handleDeleteSchedule = async (id: number) => {
    const currentApiUrl = getApiUrl();
    try {
      await fetch(`${currentApiUrl}/api/schedules/${id}`, { method: 'DELETE' });
    } catch (error) { console.error('予定の削除に失敗しました', error); }
    setDeletingScheduleId(null);
  };

  const handleOpenAssignmentModal = (staff: Staff) => {
    setSelectedStaffForAssignment(staff);
    setIsAssignmentModalOpen(true);
  };

  const handleSaveAssignment = async (data: {
    staffId: number;
    startDate: string;
    endDate: string;
    department: string;
    group: string;
  }) => {
    const currentApiUrl = getApiUrl();
    try {
      // 送信前のデータをログ出力
      console.log('=== 支援設定データ送信 ===');
      console.log('原データ:', data);
      
      // バックエンドが期待するフィールド名に変換
      const backendData = {
        staffId: data.staffId,
        startDate: data.startDate,
        endDate: data.endDate,
        tempDept: data.department,   // department → tempDept
        tempGroup: data.group        // group → tempGroup
      };
      
      console.log('送信データ:', backendData);
      console.log('API URL:', `${currentApiUrl}/api/assignments`);
      
      const response = await fetch(`${currentApiUrl}/api/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData)
      });

      console.log('レスポンス status:', response.status);
      console.log('レスポンス ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('=== 支援設定エラー詳細 ===');
        console.error('Status:', response.status);
        console.error('StatusText:', response.statusText);
        console.error('ErrorText:', errorText);
        console.error('送信したデータ:', backendData);
        
        // より詳細なエラーメッセージを表示
        let errorMessage = `支援設定の保存に失敗しました (${response.status})`;
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage += `\nエラー: ${errorJson.message || errorText}`;
          } catch {
            errorMessage += `\nエラー: ${errorText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('=== 支援設定成功 ===');
      console.log('結果:', result);
      
      // データを再取得してUIを更新
      await fetchData(displayDate);
      setIsAssignmentModalOpen(false);
      setSelectedStaffForAssignment(null);
    } catch (error) {
      console.error('=== 支援設定の保存に失敗 ===');
      console.error('エラー詳細:', error);
      alert('支援設定の保存に失敗しました。再度お試しください。\n詳細: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeleteAssignment = async (staffId: number) => {
    const currentApiUrl = getApiUrl();
    try {
      console.log('=== 支援設定削除処理開始 ===');
      console.log('削除対象スタッフID:', staffId);
      console.log('API URL:', `${currentApiUrl}/api/assignments/staff/${staffId}/current`);
      
      const response = await fetch(`${currentApiUrl}/api/assignments/staff/${staffId}/current`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('削除レスポンス status:', response.status);
      console.log('削除レスポンス ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('=== 支援設定削除エラー詳細 ===');
        console.error('Status:', response.status);
        console.error('StatusText:', response.statusText);
        console.error('ErrorText:', errorText);
        
        let errorMessage = `支援設定の削除に失敗しました (${response.status})`;
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage += `\nエラー: ${errorJson.message || errorText}`;
          } catch {
            errorMessage += `\nエラー: ${errorText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('=== 支援設定削除成功 ===');
      console.log('結果:', result);
      
      // データを再取得してUIを更新
      await fetchData(displayDate);
      setIsAssignmentModalOpen(false);
      setSelectedStaffForAssignment(null);
    } catch (error) {
      console.error('=== 支援設定の削除に失敗 ===');
      console.error('エラー詳細:', error);
      alert('支援設定の削除に失敗しました。再度お試しください。\n詳細: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleOpenResponsibilityModal = (staff: Staff) => {
    setSelectedStaffForResponsibility(staff);
    setIsResponsibilityModalOpen(true);
  };

  // 担当設定バッジを生成する関数
  const generateResponsibilityBadges = (responsibilities: ResponsibilityData | null, isReception: boolean) => {
    if (!responsibilities) return null;
    
    const badges: JSX.Element[] = [];
    
    if (isReception) {
      // 受付部署用のバッジ
      const receptionResp = responsibilities as ReceptionResponsibilityData;
      if (receptionResp.lunch) badges.push(<span key="lunch" className="ml-1 text-xs text-blue-600 font-semibold">[昼当番]</span>);
      if (receptionResp.fax) badges.push(<span key="fax" className="ml-1 text-xs text-green-600 font-semibold">[FAX]</span>);
      if (receptionResp.cs) badges.push(<span key="cs" className="ml-1 text-xs text-purple-600 font-semibold">[CS]</span>);
      if (receptionResp.custom) badges.push(<span key="custom" className="ml-1 text-xs text-red-600 font-semibold">[{receptionResp.custom}]</span>);
    } else {
      // 一般部署用のバッジ
      const generalResp = responsibilities as GeneralResponsibilityData;
      if (generalResp.fax) badges.push(<span key="fax" className="ml-1 text-xs text-green-600 font-semibold">[FAX]</span>);
      if (generalResp.subjectCheck) badges.push(<span key="subject" className="ml-1 text-xs text-orange-600 font-semibold">[件名]</span>);
      if (generalResp.custom) badges.push(<span key="custom" className="ml-1 text-xs text-red-600 font-semibold">[{generalResp.custom}]</span>);
    }
    
    return badges.length > 0 ? badges : null;
  };

  const handleSaveResponsibility = async (data: {
    staffId: number;
    responsibilities: ResponsibilityData;
  }) => {
    const currentApiUrl = getApiUrl();
    const today = displayDate.toISOString().split('T')[0];
    
    try {
      console.log('=== 担当設定保存開始 ===');
      console.log('送信データ:', data);
      console.log('対象日:', today);
      
      const response = await fetch(`${currentApiUrl}/api/responsibilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: data.staffId,
          date: today,
          responsibilities: data.responsibilities
        })
      });

      console.log('レスポンス status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('=== 担当設定エラー詳細 ===');
        console.error('Status:', response.status);
        console.error('StatusText:', response.statusText);
        console.error('ErrorText:', errorText);
        
        let errorMessage = `担当設定の保存に失敗しました (${response.status})`;
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage += `\nエラー: ${errorJson.message || errorText}`;
          } catch {
            errorMessage += `\nエラー: ${errorText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('=== 担当設定保存成功 ===');
      console.log('結果:', result);
      
      // データを再取得してUIを更新
      await fetchData(displayDate);
      setIsResponsibilityModalOpen(false);
      setSelectedStaffForResponsibility(null);
    } catch (error) {
      console.error('=== 担当設定の保存に失敗 ===');
      console.error('エラー詳細:', error);
      alert('担当設定の保存に失敗しました。再度お試しください。\n詳細: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleJsonUpload = async (file: File) => {
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
      const formData = new FormData();
      formData.append('file', file);
      const currentApiUrl = getApiUrl();

      const response = await fetch(`${currentApiUrl}/api/staff/sync-from-json`, {
        method: 'POST',
        body: formData
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
      console.log('同期結果:', result);
      
      const message = `同期完了:\n追加: ${result.added}名\n更新: ${result.updated}名\n削除: ${result.deleted}名`;
      alert(message);
      
      // データを再取得してUIを更新
      await fetchData(displayDate);
      setIsJsonUploadModalOpen(false);
    } catch (error) {
      console.error('JSONファイルの同期に失敗しました:', error);
      alert('JSONファイルの同期に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleCsvUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const currentApiUrl = getApiUrl();

      const response = await fetch(`${currentApiUrl}/api/csv-import/schedules`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'CSVファイルのインポートに失敗しました');
      }
      
      const result = await response.json();
      console.log('CSVインポート結果:', result);
      
      const message = `インポート完了:\n投入: ${result.imported}件\n競合: ${result.conflicts?.length || 0}件\n\n${result.batchId ? `バッチID: ${result.batchId}\n※ 問題があればインポート履歴から取り消し可能です` : ''}`;
      alert(message);
      
      // データを再取得してUIを更新
      await fetchData(displayDate);
      setIsCsvUploadModalOpen(false);
    } catch (error) {
      console.error('CSVファイルのインポートに失敗しました:', error);
      alert('CSVファイルのインポートに失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // インポート履歴取得
  const fetchImportHistory = async (): Promise<ImportHistory[]> => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/csv-import/history`);
      
      if (!response.ok) {
        throw new Error('履歴の取得に失敗しました');
      }
      
      return await response.json();
    } catch (error) {
      console.error('インポート履歴の取得に失敗しました:', error);
      throw error;
    }
  };

  // ロールバック実行
  const handleRollback = async (batchId: string) => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/csv-import/rollback`, {
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
      console.log('ロールバック結果:', result);
      
      const message = `ロールバック完了:\n削除: ${result.deletedCount}件\n\n削除されたデータ:\n${result.details.map((d: any) => `・${d.staff} ${d.date} ${d.status} ${d.time}`).join('\n')}`;
      alert(message);
      
      // データを再取得してUIを更新
      await fetchData(displayDate);
      setIsImportHistoryModalOpen(false);
    } catch (error) {
      console.error('ロールバックに失敗しました:', error);
      alert('ロールバックに失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleMoveSchedule = async (scheduleId: number, newStaffId: number, newStart: number, newEnd: number) => {
    const currentApiUrl = getApiUrl();
    const date = displayDate.toISOString().split('T')[0];
    
    try {
      const response = await fetch(`${currentApiUrl}/api/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: newStaffId,
          start: newStart,
          end: newEnd,
          date
        })
      });
      
      if (!response.ok) {
        throw new Error('スケジュールの移動に失敗しました');
      }
      
      // データを再取得してUIを更新
      await fetchData(displayDate);
    } catch (error) {
      console.error('スケジュール移動エラー:', error);
      alert('スケジュールの移動に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>, staff: Staff) => {
    const clickedElement = e.target as HTMLElement;
    const scheduleElement = clickedElement.closest('.absolute');
    
    // スケジュール要素をクリックした場合は、レイヤー2（調整層）の予定かチェック
    if (scheduleElement) {
      const title = scheduleElement.getAttribute('title') || '';
      if (title.includes('レイヤー2:調整')) {
        return; // レイヤー2の予定要素はドラッグ不可（既存の予定）
      }
      // レイヤー1（契約層）の上はドラッグ可能（背景扱い）
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    setDragInfo({ staff, startX, currentX: startX, rowRef: e.currentTarget });
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!dragInfo) return;
        const rect = dragInfo.rowRef.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        setDragInfo(prev => prev ? { ...prev, currentX } : null);
    };
    const handleMouseUp = () => {
        if (!dragInfo || Math.abs(dragInfo.startX - dragInfo.currentX) < 10) { setDragInfo(null); return; }
        const rowWidth = dragInfo.rowRef.offsetWidth;
        const startPercent = (Math.min(dragInfo.startX, dragInfo.currentX) / rowWidth) * 100;
        const endPercent = (Math.max(dragInfo.startX, dragInfo.currentX) / rowWidth) * 100;
        const start = positionPercentToTime(startPercent);
        const end = positionPercentToTime(endPercent);
        const snappedStart = Math.round(start * 4) / 4;
        const snappedEnd = Math.round(end * 4) / 4;
        if (snappedStart < snappedEnd) {
            handleOpenModal(null, { staffId: dragInfo.staff.id, start: snappedStart, end: snappedEnd });
        }
        setDragInfo(null);
    };
    if (dragInfo) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo]);

  const staffWithCurrentStatus = useMemo(() => {
    const currentDecimalHour = currentTime.getHours() + currentTime.getMinutes() / 60;
    return staffList.map(staff => {
      const applicableSchedules = schedules.filter(s => s.staffId === staff.id && currentDecimalHour >= s.start && currentDecimalHour < s.end);
      const currentSchedule = applicableSchedules.length > 0 ? applicableSchedules.reduce((latest, current) => latest.id > current.id ? latest : current) : null;
      return { ...staff, currentStatus: currentSchedule ? currentSchedule.status : 'Off' };
    });
  }, [staffList, schedules, currentTime]);
  
  const departmentGroupFilteredStaff = useMemo(() => {
    return staffWithCurrentStatus.filter(staff => {
        // 支援中の場合は現在の部署/グループでフィルタリング、そうでなければ元の部署/グループでフィルタリング
        const currentDepartment = staff.isSupporting ? (staff.currentDept || staff.department) : staff.department;
        const currentGroup = staff.isSupporting ? (staff.currentGroup || staff.group) : staff.group;
        const departmentMatch = selectedDepartment === 'all' || currentDepartment === selectedDepartment;
        const groupMatch = selectedGroup === 'all' || currentGroup === selectedGroup;
        return departmentMatch && groupMatch;
    });
  }, [staffWithCurrentStatus, selectedDepartment, selectedGroup]);

  const availableStaffCount = useMemo(() => departmentGroupFilteredStaff.filter(staff => AVAILABLE_STATUSES.includes(staff.currentStatus)).length, [departmentGroupFilteredStaff]);

  // 今日かどうかを判定
  const isToday = useMemo(() => {
    const now = new Date();
    return displayDate.getFullYear() === now.getFullYear() && 
           displayDate.getMonth() === now.getMonth() && 
           displayDate.getDate() === now.getDate();
  }, [displayDate]);

  // 今日以外の日付に変更された時、selectedStatusを「all」にリセット
  useEffect(() => {
    if (!isToday && (selectedStatus === 'available' || selectedStatus === 'unavailable')) {
      setSelectedStatus('all');
    }
  }, [isToday, selectedStatus]);


  const filteredStaffForDisplay = useMemo(() => {
      const statusFiltered = departmentGroupFilteredStaff.filter(staff => {
        if (selectedStatus === 'all') return true;
        if (selectedStatus === 'available') return AVAILABLE_STATUSES.includes(staff.currentStatus);
        if (selectedStatus === 'unavailable') return !AVAILABLE_STATUSES.includes(staff.currentStatus);
        return true;
      });
      
      return statusFiltered.filter(staff => {
        if (selectedSettingFilter === 'all') return true;
        if (selectedSettingFilter === 'responsibility') return staff.hasResponsibilities;
        if (selectedSettingFilter === 'support') return staff.isSupporting;
        return true;
      });
  }, [departmentGroupFilteredStaff, selectedStatus, selectedSettingFilter]);
  
  const chartData = useMemo(() => {
    const data: any[] = [];
    const staffToChart = staffList.filter(staff => {
        // 支援中の場合は現在の部署/グループでフィルタリング、そうでなければ元の部署/グループでフィルタリング
        const currentDepartment = staff.isSupporting ? (staff.currentDept || staff.department) : staff.department;
        const currentGroup = staff.isSupporting ? (staff.currentGroup || staff.group) : staff.group;
        const departmentMatch = selectedDepartment === 'all' || currentDepartment === selectedDepartment;
        const groupMatch = selectedGroup === 'all' || currentGroup === selectedGroup;
        return departmentMatch && groupMatch;
    });
    let statusesToDisplay: string[];
    if (selectedStatus === 'all') { statusesToDisplay = availableStatuses; } 
    else if (selectedStatus === 'available') { statusesToDisplay = AVAILABLE_STATUSES; } 
    else { statusesToDisplay = availableStatuses.filter(s => !AVAILABLE_STATUSES.includes(s)); }
    
    // 15分単位でのデータポイント生成（8:00開始）
    const timePoints = [];
    
    // 8:00から15分刻みで追加
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === 20 && minute > 45) break; // 20:45まで
        const time = hour + minute / 60;
        const label = `${hour}:${String(minute).padStart(2, '0')}`;
        const dataRange = [time, time + 0.25]; // 15分間の範囲
        timePoints.push({ hour: time, label, dataRange });
      }
    }
    
    timePoints.forEach(timePoint => {
      const { hour, label, dataRange } = timePoint;
      const counts: { [key: string]: any } = { time: label };
      statusesToDisplay.forEach(status => { counts[status] = 0; });
      staffToChart.forEach(staff => {
        const [rangeStart, rangeEnd] = dataRange;
        
        // 15分間隔の中間点でのステータスを取得
        const checkTime = rangeStart + 0.125; // 15分間の中間点（7.5分後）
        
        const applicableSchedules = schedules.filter(s => 
          s.staffId === staff.id && 
          checkTime >= s.start && 
          checkTime < s.end
        );
        
        const topSchedule = applicableSchedules.length > 0 ? 
          applicableSchedules.reduce((latest, current) => latest.id > current.id ? latest : current) : null;
        const status = topSchedule ? topSchedule.status : 'Off';
        if (statusesToDisplay.includes(status)) { counts[status]++; }
      });
      data.push(counts);
    });
    return data;
  }, [schedules, staffList, selectedDepartment, selectedGroup, selectedStatus]);

  const currentTimePosition = useMemo(() => {
    const now = new Date();
    const isToday = displayDate.getFullYear() === now.getFullYear() && displayDate.getMonth() === now.getMonth() && displayDate.getDate() === now.getDate();
    if (!isToday) return null;
    const currentDecimalHour = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (currentDecimalHour < 8 || currentDecimalHour >= 21) { return null; }
    return timeToPositionPercent(currentDecimalHour);
  }, [currentTime, displayDate]);

  const groupedStaffForGantt = useMemo(() => {
    return filteredStaffForDisplay.reduce((acc, staff) => {
      // 支援中の場合は現在の部署/グループを使用、そうでなければ元の部署/グループを使用
      const department = staff.isSupporting ? (staff.currentDept || staff.department) : staff.department;
      const group = staff.isSupporting ? (staff.currentGroup || staff.group) : staff.group;
      if (!acc[department]) { acc[department] = {}; }
      if (!acc[department][group]) { acc[department][group] = []; }
      acc[department][group].push(staff);
      return acc;
    }, {} as Record<string, Record<string, Staff[]>>);
  }, [filteredStaffForDisplay]);
  
  
  const handleDateChange = (days: number) => { setDisplayDate(current => { const newDate = new Date(current); newDate.setDate(newDate.getDate() + days); return newDate; }); };
  const goToToday = () => setDisplayDate(new Date());

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

  const CustomDatePickerInput = forwardRef<HTMLButtonElement, { value?: string, onClick?: () => void }>(({ value, onClick }, ref) => (
    <button className="text-xl font-semibold text-gray-700" onClick={onClick} ref={ref}>
      {value}
    </button>
  ));
  CustomDatePickerInput.displayName = 'CustomDatePickerInput';

  if (isLoading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <Fragment>
      <ScheduleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} staffList={staffList as Staff[]} onSave={handleSaveSchedule} scheduleToEdit={editingSchedule} initialData={draggedSchedule || undefined} />
      <ConfirmationModal isOpen={deletingScheduleId !== null} onClose={() => setDeletingScheduleId(null)} onConfirm={() => { if (deletingScheduleId) handleDeleteSchedule(deletingScheduleId); }} message="この予定を削除しますか？" />
      <JsonUploadModal isOpen={isJsonUploadModalOpen} onClose={() => setIsJsonUploadModalOpen(false)} onUpload={handleJsonUpload} />
      <CsvUploadModal isOpen={isCsvUploadModalOpen} onClose={() => setIsCsvUploadModalOpen(false)} onUpload={handleCsvUpload} />
      <AssignmentModal 
        isOpen={isAssignmentModalOpen} 
        onClose={() => {
          setIsAssignmentModalOpen(false);
          setSelectedStaffForAssignment(null);
        }} 
        staff={selectedStaffForAssignment} 
        staffList={staffList} 
        onSave={handleSaveAssignment}
        onDelete={handleDeleteAssignment}
      />
      <ResponsibilityModal 
        isOpen={isResponsibilityModalOpen}
        onClose={() => {
          setIsResponsibilityModalOpen(false);
          setSelectedStaffForResponsibility(null);
        }}
        staff={selectedStaffForResponsibility}
        onSave={handleSaveResponsibility}
      />
      <ImportHistoryModal 
        isOpen={isImportHistoryModalOpen}
        onClose={() => setIsImportHistoryModalOpen(false)}
        onRollback={handleRollback}
      />
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      
      <main className="container mx-auto p-4 font-sans">
        <header className="mb-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button type="button" onClick={() => handleDateChange(-1)} className="px-3 py-1 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100">&lt;</button>
                    <button type="button" onClick={goToToday} className="px-3 py-1 text-sm font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100">今日</button>
                    <button type="button" onClick={() => handleDateChange(1)} className="px-3 py-1 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100">&gt;</button>
                </div>
                <DatePicker
                  selected={displayDate}
                  onChange={(date: Date | null) => date && setDisplayDate(date)}
                  customInput={<CustomDatePickerInput />}
                  locale="ja"
                  dateFormat="yyyy年M月d日(E)"
                  popperClassName="!z-[10000]"
                  popperPlacement="bottom-start"
                />
            </div>

            <div className="flex items-center space-x-2">
                <button onClick={() => {
                  setSelectedSchedule(null);
                  handleOpenModal();
                }} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">
                    予定を追加
                </button>
                <button onClick={() => {
                  setSelectedSchedule(null);
                  setIsSettingsModalOpen(true);
                }} className="px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700">
                    ⚙️ 設定
                </button>
            </div>
        </header>

        <div className="mb-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <select onChange={(e) => setSelectedDepartment(e.target.value)} value={selectedDepartment} className="rounded-md border-gray-300 shadow-sm"><option value="all">すべての部署</option>{Array.from(new Set(staffList.map(s => s.isSupporting ? (s.currentDept || s.department) : s.department))).map(dep => <option key={dep} value={dep}>{dep}</option>)}</select>
                <select onChange={(e) => setSelectedGroup(e.target.value)} value={selectedGroup} className="rounded-md border-gray-300 shadow-sm"><option value="all">すべてのグループ</option>{Array.from(new Set(staffList.filter(s => {
                  const currentDept = s.isSupporting ? (s.currentDept || s.department) : s.department;
                  return selectedDepartment === 'all' || currentDept === selectedDepartment;
                }).map(s => s.isSupporting ? (s.currentGroup || s.group) : s.group))).map(grp => <option key={grp} value={grp}>{grp}</option>)}</select>
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button type="button" onClick={() => setSelectedSettingFilter('all')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-l-lg border ${selectedSettingFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>すべて</button>
                    <button type="button" onClick={() => setSelectedSettingFilter('responsibility')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 border-t border-b ${selectedSettingFilter === 'responsibility' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>担当設定</button>
                    <button type="button" onClick={() => setSelectedSettingFilter('support')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-r-lg border ${selectedSettingFilter === 'support' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>支援設定</button>
                </div>
                {isToday && (
                  <div className="inline-flex rounded-md shadow-sm" role="group">
                      <button type="button" onClick={() => setSelectedStatus('all')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-l-lg border ${selectedStatus === 'all' ? 'bg-green-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>すべて</button>
                      <button type="button" onClick={() => setSelectedStatus('available')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 border-t border-b ${selectedStatus === 'available' ? 'bg-green-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>対応可能</button>
                      <button type="button" onClick={() => setSelectedStatus('unavailable')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-r-lg border ${selectedStatus === 'unavailable' ? 'bg-green-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>対応不可</button>
                  </div>
                )}
            </div>
            {isToday && (
              <div className="text-right">
                  <p className="text-xs text-gray-600">現在の対応可能人数</p>
                  <p className="text-lg font-bold text-green-600">{availableStaffCount}人</p>
              </div>
            )}
        </div>

        <StatusChart data={chartData} staffList={staffList} selectedDepartment={selectedDepartment} selectedGroup={selectedGroup} />
        
        <div className="bg-white shadow rounded-lg relative">
          <div className="flex">
            <div className="min-w-fit max-w-[400px] sticky left-0 z-20 bg-white border-r border-gray-200">
              {/* 上部スクロールバー用のスペーサー */}
              <div className="h-[17px] bg-gray-50 border-b"></div>
              {/* ヘッダー行 - 時刻行と同じ高さに調整 */}
              <div className="px-2 py-2 bg-gray-100 font-bold text-gray-600 text-sm text-center border-b whitespace-nowrap">部署 / グループ / スタッフ名</div>
              {Object.keys(groupedStaffForGantt).length > 0 ? (
                Object.entries(groupedStaffForGantt).map(([department, groups]) => (
                  <div key={department} className="department-group">
                    <h3 className="px-2 min-h-[33px] text-sm font-bold whitespace-nowrap flex items-center" style={{backgroundColor: departmentColors[department] || '#f5f5f5'}}>{department}</h3>
                    {Object.entries(groups).map(([group, staffInGroup]) => (
                      <div key={group}>
                        <h4 className="px-2 pl-6 min-h-[33px] text-xs font-semibold whitespace-nowrap flex items-center" style={{backgroundColor: teamColors[group] || '#f5f5f5'}}>{group}</h4>
                        {staffInGroup.map(staff => (
                          <div key={staff.id} className={`px-2 pl-12 text-sm font-medium whitespace-nowrap h-[45px] hover:bg-gray-50 flex items-center cursor-pointer ${
                            staff.isSupporting ? 'bg-amber-50 border border-amber-400' : ''
                          }`}
                               onClick={() => handleOpenResponsibilityModal(staff)}
                               onContextMenu={(e) => {
                                 e.preventDefault(); // デフォルトのコンテキストメニューを無効化
                                 if (!staff.department.includes('受付') && !staff.group.includes('受付')) {
                                   handleOpenAssignmentModal(staff);
                                 }
                               }}>
                            <span className={staff.isSupporting ? 'text-amber-800' : ''}>
                              {staff.name}
                              {staff.isSupporting && (
                                <span className="ml-1 text-xs text-amber-600 font-semibold">[支援]</span>
                              )}
                              {generateResponsibilityBadges(staff.responsibilities || null, staff.isReception || false)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 whitespace-nowrap">表示対象のスタッフがいません。</div>
              )}
            </div>
            <div className="flex-1 flex flex-col">
              {/* 上部スクロールバー */}
              <div className="overflow-x-auto border-b" ref={topScrollRef} onScroll={handleTopScroll}>
                <div className="min-w-[1300px] h-[17px]"></div>
              </div>
              {/* ヘッダー行 */}
              <div className="sticky top-0 z-50 bg-gray-100 border-b overflow-hidden">
                <div className="min-w-[1300px]">
                  <div className="flex font-bold text-sm">
                    {Array.from({ length: 13 }).map((_, i) => {
                      const hour = 8 + i;
                      const isEarlyOrNight = hour === 8 || hour >= 18; // 8:00と18:00以降を特別扱い
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
              {/* メインコンテンツ */}
              <div className="flex-1 overflow-x-auto" ref={bottomScrollRef} onScroll={handleBottomScroll}>
                <div className="min-w-[1300px] relative">
                  {/* 15分単位の目盛り */}
                  {(() => {
                    const markers = [];
                    
                    // 8:00-21:00の15分単位目盛り
                    for (let hour = 8; hour <= 21; hour++) {
                      for (let minute = 0; minute < 60; minute += 15) {
                        if (hour === 21 && minute > 0) break; // 21:00で終了
                        const time = hour + minute / 60;
                        const position = timeToPositionPercent(time);
                        const timeString = `${hour}:${String(minute).padStart(2, '0')}`;
                        
                        // すべて同じ濃さの線に統一
                        const lineClass = "absolute top-0 bottom-0 w-0.5 border-l border-gray-300 z-5 opacity-50";
                        
                        markers.push(
                          <div
                            key={`${hour}-${minute}`}
                            className={lineClass}
                            style={{ left: `${position}%` }}
                            title={timeString}
                          >
                          </div>
                        );
                      }
                    }
                    return markers;
                  })()}
                  {/* 早朝エリア（8:00-9:00）の背景強調 */}
                  <div className="absolute top-0 bottom-0 bg-blue-50 opacity-30 z-10" 
                       style={{ left: `0%`, width: `${((9-8)*4)/52*100}%` }} 
                       title="早朝時間帯（8:00-9:00）">
                  </div>
                  {/* 夜間エリア（18:00-21:00）の背景強調 */}
                  <div className="absolute top-0 bottom-0 bg-blue-50 opacity-30 z-10" 
                       style={{ left: `${((18-8)*4)/52*100}%`, width: `${((21-18)*4)/52*100}%` }} 
                       title="夜間時間帯（18:00-21:00）">
                  </div>
                  {currentTimePosition !== null && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30" 
                         style={{ left: `${currentTimePosition}%` }} 
                         title={`現在時刻: ${currentTime.getHours()}:${String(currentTime.getMinutes()).padStart(2, '0')}`}>
                    </div>
                  )}
                  {Object.keys(groupedStaffForGantt).length > 0 ? (
                    Object.entries(groupedStaffForGantt).map(([department, groups]) => (
                      <div key={department} className="department-group">
                        <div className="min-h-[33px]" style={{backgroundColor: departmentColors[department] || '#f5f5f5'}}></div>
                        {Object.entries(groups).map(([group, staffInGroup]) => (
                          <div key={group}>
                            <div className="min-h-[33px]" style={{backgroundColor: teamColors[group] || '#f5f5f5'}}></div>
                            {staffInGroup.map(staff => (
                              <div key={staff.id} className={`h-[45px] relative hover:bg-gray-50 ${
                                     staff.isSupporting ? 'bg-amber-50' : ''
                                   }`}
                                   onMouseDown={(e) => handleTimelineMouseDown(e, staff)}
                                   onMouseLeave={() => {
                                     // マウスがスタッフ行から離れたら選択解除
                                     setSelectedSchedule(null);
                                   }}
                                   onDragOver={(e) => {
                                     e.preventDefault();
                                     e.dataTransfer.dropEffect = 'move';
                                   }}
                                   onDrop={(e) => {
                                     e.preventDefault();
                                     const scheduleData = e.dataTransfer.getData('application/json');
                                     if (scheduleData && draggedSchedule && draggedSchedule.start !== undefined && draggedSchedule.end !== undefined && draggedSchedule.id !== undefined) {
                                       const rect = e.currentTarget.getBoundingClientRect();
                                       const dropX = e.clientX - rect.left;
                                       const dropPercent = (dropX / rect.width) * 100;
                                       const newStartTime = positionPercentToTime(dropPercent);
                                       const duration = draggedSchedule.end - draggedSchedule.start;
                                       const snappedStart = Math.round(newStartTime * 4) / 4;
                                       const snappedEnd = snappedStart + duration;
                                       
                                       if (snappedStart >= 8 && snappedEnd <= 21) {
                                         // スケジュール移動のAPI呼び出し
                                         handleMoveSchedule(draggedSchedule.id, staff.id, snappedStart, snappedEnd);
                                       }
                                     }
                                   }}>
                                {schedules.filter(s => s.staffId === staff.id).sort((a, b) => {
                                  // レイヤー順: contract(1) < adjustment(2)
                                  const layerOrder: { [key: string]: number } = { contract: 1, adjustment: 2 };
                                  const aLayer = (a as any).layer || 'adjustment';
                                  const bLayer = (b as any).layer || 'adjustment';
                                  return layerOrder[aLayer] - layerOrder[bLayer];
                                }).map((schedule) => {
                                  const startPosition = timeToPositionPercent(schedule.start);
                                  const endPosition = timeToPositionPercent(schedule.end);
                                  const barWidth = endPosition - startPosition;
                                  const scheduleLayer = schedule.layer || 'adjustment';
                                  const isContract = scheduleLayer === 'contract';
                                  
                                  return (
                                    <div key={`${schedule.id}-${scheduleLayer}-${schedule.staffId}`} 
                                         draggable={!isContract}
                                         className={`absolute h-6 rounded text-white text-xs flex items-center justify-between px-2 ${
                                           isContract ? 'cursor-default' : 'cursor-ew-resize hover:opacity-80'
                                         } ${
                                           selectedSchedule && selectedSchedule.schedule.id === schedule.id && selectedSchedule.layer === scheduleLayer
                                             ? 'ring-2 ring-yellow-400 ring-offset-1'
                                             : ''
                                         }`}
                                         style={{ 
                                           left: `${startPosition}%`, 
                                           width: `${barWidth}%`, 
                                           top: '50%', 
                                           transform: 'translateY(-50%)', 
                                           backgroundColor: statusColors[schedule.status] || '#9ca3af',
                                           opacity: isContract ? 0.5 : 1,
                                           backgroundImage: isContract ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)' : 'none',
                                           zIndex: isContract ? 10 : 30
                                         }} 
                                         onClick={(e) => { 
                                           e.stopPropagation(); 
                                           if (!isContract) {
                                             const currentSelection = selectedSchedule;
                                             if (currentSelection && 
                                                 currentSelection.schedule.id === schedule.id && 
                                                 currentSelection.layer === scheduleLayer) {
                                               // 同じ予定を再クリック → 編集モーダルを開く
                                               handleOpenModal(schedule);
                                               setSelectedSchedule(null);
                                             } else {
                                               // 異なる予定をクリック → 選択状態にする
                                               setSelectedSchedule({ schedule, layer: scheduleLayer });
                                             }
                                           }
                                         }}
                                         onDragStart={(e) => {
                                           if (isContract) {
                                             e.preventDefault();
                                             return;
                                           }
                                           // ドラッグ開始時に選択状態をクリア
                                           setSelectedSchedule(null);
                                           setDraggedSchedule(schedule);
                                           e.dataTransfer.setData('application/json', JSON.stringify(schedule));
                                           e.dataTransfer.effectAllowed = 'move';
                                         }}
                                         onDragEnd={() => {
                                           setDraggedSchedule(null);
                                         }}
                                         title={`${schedule.status}${schedule.memo ? ': ' + schedule.memo : ''} (${isContract ? 'レイヤー1:契約' : 'レイヤー2:調整'})`}>
                                      <span className="truncate">
                                        {schedule.status}
                                        {schedule.memo && (
                                          <span className="ml-1 text-yellow-200">📝</span>
                                        )}
                                      </span>
                                      {!isContract && (
                                        <button onClick={(e) => { e.stopPropagation(); setDeletingScheduleId(schedule.id); }} 
                                                className="text-white hover:text-red-200 ml-2">×</button>
                                      )}
                                    </div>
                                  );
                                })}
                                {dragInfo && dragInfo.staff.id === staff.id && (
                                  <div className="absolute bg-indigo-200 bg-opacity-50 border-2 border-dashed border-indigo-500 rounded pointer-events-none z-30"
                                       style={{ 
                                         left: `${Math.min(dragInfo.startX, dragInfo.currentX)}px`, 
                                         top: '25%', 
                                         width: `${Math.abs(dragInfo.currentX - dragInfo.startX)}px`, 
                                         height: '50%' 
                                       }} />
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Fragment>
  );
}
