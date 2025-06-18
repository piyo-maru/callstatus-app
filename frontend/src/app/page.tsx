'use client';

import { useState, useEffect, useMemo, useCallback, Fragment, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// ★★★ カレンダーライブラリをインポート ★★★
import DatePicker, { registerLocale } from 'react-datepicker';
import ja from 'date-fns/locale/ja';
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
};

type ScheduleFromDB = {
  id: number;
  staffId: number;
  status: string;
  start: string;
  end: string;
  memo?: string;
};

type Schedule = {
  id: number;
  staffId: number;
  status: string;
  start: number;
  end: number;
  memo?: string;
};

type DragInfo = {
  staff: Staff;
  startX: number;
  currentX: number;
  rowRef: HTMLDivElement;
};

// --- 定数定義 ---
const statusColors: { [key: string]: string } = {
  'Online': '#22c55e', 'Remote': '#10b981', 'Meeting': '#f59e0b', 'Training': '#3b82f6',
  'Break': '#f97316', 'Off': '#ef4444', 'Night Duty': '#4f46e5',
};
// 設定ファイルからAPIのURLを取得する関数
const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.APP_CONFIG) {
    return window.APP_CONFIG.API_HOST;
  }
  // フォールバック（サーバーサイドレンダリング時など）
  return 'http://localhost:3002';
};
const availableStatuses = ['Online', 'Remote', 'Meeting', 'Training', 'Break', 'Off', 'Night Duty'];
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
  // JIS第1-2水準漢字 + ひらがな + カタカナ + 英数字 + 基本記号の範囲
  const supportedCharsRegex = /^[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\u0020-\u007e\uff01-\uff5e\u3000\u301c\u2010-\u2015\u2018-\u201f\u2026\u2030\u203b\u2212\u2500-\u257f]*$/;
  
  const errors: CharacterCheckResult['errors'] = [];
  
  data.forEach((item, index) => {
    // 名前をチェック
    if (!supportedCharsRegex.test(item.name)) {
      const invalidChars = [...item.name].filter(char => !supportedCharsRegex.test(char));
      errors.push({
        field: 'name',
        value: item.name,
        invalidChars: [...new Set(invalidChars)],
        position: index + 1
      });
    }
    
    // 部署をチェック
    if (!supportedCharsRegex.test(item.dept)) {
      const invalidChars = [...item.dept].filter(char => !supportedCharsRegex.test(char));
      errors.push({
        field: 'dept',
        value: item.dept,
        invalidChars: [...new Set(invalidChars)],
        position: index + 1
      });
    }
    
    // チーム/グループをチェック
    if (!supportedCharsRegex.test(item.team)) {
      const invalidChars = [...item.team].filter(char => !supportedCharsRegex.test(char));
      errors.push({
        field: 'team',
        value: item.team,
        invalidChars: [...new Set(invalidChars)],
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
            employeeDataを含むJSONファイルをアップロードしてスタッフデータを同期します。
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
        {/* 左列 - ガントチャートと同じ幅を確保 */}
        <div className="min-w-fit max-w-[400px] border-r border-gray-200">
          <div className="px-2 py-2 bg-gray-100 font-bold text-gray-600 text-sm text-center border-b whitespace-nowrap">ステータス推移</div>
          <div className="h-[17px] bg-gray-50 border-b"></div>
          <div className="px-2 py-2 bg-gray-100 font-bold text-gray-600 text-sm text-center border-b whitespace-nowrap">グラフ</div>
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
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {availableStatuses.map(status => (
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date());
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [draggedSchedule, setDraggedSchedule] = useState<Partial<Schedule> | null>(null);
  const [isJsonUploadModalOpen, setIsJsonUploadModalOpen] = useState(false);
  
  // スクロール同期用のref
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  const fetchData = useCallback(async (date: Date) => {
    setIsLoading(true);
    const dateString = date.toISOString().split('T')[0];
    const currentApiUrl = getApiUrl();
    try {
      const res = await fetch(`${currentApiUrl}/api/schedules?date=${dateString}`);
      if (!res.ok) throw new Error(`Network response was not ok`);
      const data: { staff: Staff[], schedules: ScheduleFromDB[] } = await res.json();
      setStaffList(data.staff as Staff[]);
      const formattedSchedules = data.schedules.map(s => {
        const start = new Date(s.start);
        const end = new Date(s.end);
        return { ...s, start: start.getHours() + start.getMinutes() / 60, end: end.getHours() + end.getMinutes() / 60 };
      });
      setSchedules(formattedSchedules);
    } catch (error) { console.error('データの取得に失敗しました', error); } 
    finally { setIsLoading(false); }
  }, []);
  
  useEffect(() => {
    fetchData(displayDate);
  }, [displayDate, fetchData]);

  useEffect(() => {
    const currentApiUrl = getApiUrl();
    const socket: Socket = io(currentApiUrl);
    const handleNewSchedule = (newSchedule: ScheduleFromDB) => {
        const scheduleDate = new Date(newSchedule.start);
        if(scheduleDate.toISOString().split('T')[0] === displayDate.toISOString().split('T')[0]) {
            const formatted = { ...newSchedule, start: scheduleDate.getHours() + scheduleDate.getMinutes()/60, end: new Date(newSchedule.end).getHours() + new Date(newSchedule.end).getMinutes()/60 };
            setSchedules((prev) => [...prev, formatted]);
        }
    };
    const handleUpdatedSchedule = (updatedSchedule: ScheduleFromDB) => {
        const scheduleDate = new Date(updatedSchedule.start);
        if(scheduleDate.toISOString().split('T')[0] === displayDate.toISOString().split('T')[0]){
            const formatted = { ...updatedSchedule, start: scheduleDate.getHours() + scheduleDate.getMinutes()/60, end: new Date(updatedSchedule.end).getHours() + new Date(updatedSchedule.end).getMinutes()/60 };
            setSchedules(prev => prev.map(s => s.id === formatted.id ? formatted : s));
        }
    }
    const handleDeletedSchedule = (id: number) => setSchedules((prev) => prev.filter(s => s.id !== id));
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
    const payload = { ...scheduleData, date };
    const currentApiUrl = getApiUrl();
    try {
      console.log('Saving schedule with payload:', payload);
      let response;
      if (scheduleData.id) {
        response = await fetch(`${currentApiUrl}/api/schedules/${scheduleData.id}`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
      } else {
        response = await fetch(`${currentApiUrl}/api/schedules`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, response.statusText, errorText);
        throw new Error(`スケジュールの保存に失敗しました: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Schedule saved successfully:', result);
    } catch (error) {
      console.error('スケジュールの保存に失敗しました:', error);
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
        
        alert(`文字チェックエラー:\n\n${errorMessage}\n\n使用可能な文字: ひらがな、カタカナ、漢字（JIS第1-2水準）、英数字、基本記号のみ`);
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
  
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>, staff: Staff) => {
    if ((e.target as HTMLElement).closest('.absolute')) { return; }
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
        const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
        const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
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
      return departmentGroupFilteredStaff.filter(staff => {
        if (selectedStatus === 'all') return true;
        if (selectedStatus === 'available') return AVAILABLE_STATUSES.includes(staff.currentStatus);
        if (selectedStatus === 'unavailable') return !AVAILABLE_STATUSES.includes(staff.currentStatus);
        return true;
      });
  }, [departmentGroupFilteredStaff, selectedStatus]);
  
  const chartData = useMemo(() => {
    const data = [];
    const staffToChart = staffList.filter(staff => {
        const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
        const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
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

  const groupedStaff = useMemo(() => {
    return filteredStaffForDisplay.reduce((acc, staff) => {
      const { department, group } = staff;
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
                />
            </div>

            <div className="flex items-center space-x-2">
                <button onClick={() => setIsJsonUploadModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700">
                    スタッフデータ同期
                </button>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">
                    予定を追加
                </button>
            </div>
        </header>

        <div className="mb-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <select onChange={(e) => setSelectedDepartment(e.target.value)} value={selectedDepartment} className="rounded-md border-gray-300 shadow-sm"><option value="all">すべての部署</option>{Array.from(new Set(staffList.map(s => s.department))).map(dep => <option key={dep} value={dep}>{dep}</option>)}</select>
                <select onChange={(e) => setSelectedGroup(e.target.value)} value={selectedGroup} className="rounded-md border-gray-300 shadow-sm"><option value="all">すべてのグループ</option>{Array.from(new Set(staffList.filter(s => selectedDepartment === 'all' || s.department === selectedDepartment).map(s => s.group))).map(grp => <option key={grp} value={grp}>{grp}</option>)}</select>
                {isToday && (
                  <div className="inline-flex rounded-md shadow-sm" role="group">
                      <button type="button" onClick={() => setSelectedStatus('all')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-l-lg border ${selectedStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>すべて</button>
                      <button type="button" onClick={() => setSelectedStatus('available')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 border-t border-b ${selectedStatus === 'available' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>対応可能</button>
                      <button type="button" onClick={() => setSelectedStatus('unavailable')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-r-lg border ${selectedStatus === 'unavailable' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>対応不可</button>
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
              {Object.keys(groupedStaff).length > 0 ? (
                Object.entries(groupedStaff).map(([department, groups]) => (
                  <div key={department} className="department-group">
                    <h3 className="px-2 min-h-[33px] text-sm font-bold bg-gray-200 whitespace-nowrap flex items-center">{department}</h3>
                    {Object.entries(groups).map(([group, staffInGroup]) => (
                      <div key={group}>
                        <h4 className="px-2 pl-6 min-h-[33px] text-xs font-semibold bg-gray-100 whitespace-nowrap flex items-center">{group}</h4>
                        {staffInGroup.map(staff => (
                          <div key={staff.id} className="px-2 pl-12 text-sm font-medium whitespace-nowrap h-[45px] hover:bg-gray-50 flex items-center">
                            {staff.name}
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
                  {Object.keys(groupedStaff).length > 0 ? (
                    Object.entries(groupedStaff).map(([department, groups]) => (
                      <div key={department} className="department-group">
                        <div className="min-h-[33px] bg-gray-200"></div>
                        {Object.entries(groups).map(([group, staffInGroup]) => (
                          <div key={group}>
                            <div className="min-h-[33px] bg-gray-100"></div>
                            {staffInGroup.map(staff => (
                              <div key={staff.id} className="h-[45px] relative hover:bg-gray-50"
                                   onMouseDown={(e) => handleTimelineMouseDown(e, staff)}>
                                {schedules.filter(s => s.staffId === staff.id).sort((a, b) => a.id - b.id).map((schedule) => {
                                  const startPosition = timeToPositionPercent(schedule.start);
                                  const endPosition = timeToPositionPercent(schedule.end);
                                  const barWidth = endPosition - startPosition;
                                  return (
                                    <div key={schedule.id} 
                                         className="absolute h-6 rounded text-white text-xs flex items-center justify-between px-2 cursor-pointer hover:opacity-80"
                                         style={{ 
                                           left: `${startPosition}%`, 
                                           width: `${barWidth}%`, 
                                           top: '50%', 
                                           transform: 'translateY(-50%)', 
                                           backgroundColor: statusColors[schedule.status] || '#9ca3af', 
                                           zIndex: 20 
                                         }} 
                                         onClick={(e) => { e.stopPropagation(); handleOpenModal(schedule); }}
                                         title={schedule.memo ? `${schedule.status}: ${schedule.memo}` : schedule.status}>
                                      <span className="truncate">
                                        {schedule.status}
                                        {schedule.memo && (
                                          <span className="ml-1 text-yellow-200">📝</span>
                                        )}
                                      </span>
                                      <button onClick={(e) => { e.stopPropagation(); setDeletingScheduleId(schedule.id); }} 
                                              className="text-white hover:text-red-200 ml-2">×</button>
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
