'use client';

import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthProvider';

// 既存のタイプとユーティリティを再利用
import {
  STATUS_COLORS,
  capitalizeStatus
} from './timeline/TimelineUtils';

// 型定義（既存と同じ）
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
  date?: string;
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
  displayName: string;
  timeDisplay: string;
  schedules: Array<{
    status: string;
    startTime: number;
    endTime: number;
    memo?: string;
  }>;
}

const MonthlyPlannerPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  
  // 基本状態
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedCells, setSelectedCells] = useState<Date[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [existingSchedules, setExistingSchedules] = useState<Map<string, Schedule[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI状態
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetSchedule | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // API設定（既存ページと同じ）
  const getApiUrl = (): string => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3002';
      } else {
        return `http://${hostname}:3002`;
      }
    }
    return 'http://localhost:3002';
  };

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('accessToken');
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
  }, []);

  // プリセット定義（個人ページと同じ）
  const presetSchedules: PresetSchedule[] = [
    { 
      id: 'remote-work', 
      name: '在宅勤務', 
      displayName: '在宅勤務',
      timeDisplay: '09:00-18:00',
      schedules: [{ status: 'remote', startTime: 9, endTime: 18 }]
    },
    { 
      id: 'night-duty', 
      name: '夜間勤務', 
      displayName: '夜間勤務',
      timeDisplay: '18:00-21:00 + 調整',
      schedules: [
        { status: 'night duty', startTime: 18, endTime: 21 },
        { status: 'off', startTime: 9, endTime: 13 },
        { status: 'break', startTime: 17, endTime: 18 }
      ]
    },
    { 
      id: 'vacation', 
      name: '休暇', 
      displayName: '休暇',
      timeDisplay: '全日',
      schedules: [{ status: 'off', startTime: 9, endTime: 18 }]
    },
    { 
      id: 'morning-off', 
      name: '午前休', 
      displayName: '午前休',
      timeDisplay: '09:00-13:00',
      schedules: [{ status: 'off', startTime: 9, endTime: 13 }]
    },
    { 
      id: 'afternoon-off', 
      name: '午後休', 
      displayName: '午後休',
      timeDisplay: '12:00-18:00',
      schedules: [{ status: 'off', startTime: 12, endTime: 18 }]
    },
    { 
      id: 'early-leave', 
      name: '早退', 
      displayName: '早退',
      timeDisplay: '12:00-18:00',
      schedules: [{ status: 'unplanned', startTime: 12, endTime: 18 }]
    }
  ];

  // カレンダー用の日付生成（週開始を考慮）
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 日曜日開始
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [selectedMonth]);

  // 社員情報取得
  const fetchCurrentStaff = useCallback(async () => {
    if (!user?.email) return;

    try {
      const response = await authenticatedFetch(`${getApiUrl()}/api/staff`);
      if (response.ok) {
        const staffList: Staff[] = await response.json();
        
        // ユーザーに対応する社員を検索
        let userStaff = staffList.find(staff => 
          staff.name.includes(user.email.split('@')[0]) || 
          staff.empNo === user.email.split('@')[0]
        );
        
        if (!userStaff && staffList.length > 0) {
          userStaff = staffList[0];
        }
        
        if (userStaff) {
          setCurrentStaff(userStaff);
          console.log('Current staff loaded:', userStaff);
        } else {
          setError('対応する社員情報が見つかりません');
        }
      } else {
        setError('社員情報の取得に失敗しました');
      }
    } catch (err) {
      console.error('社員情報の取得に失敗:', err);
      setError('社員情報の取得中にエラーが発生しました');
    }
  }, [user, getApiUrl, authenticatedFetch]);

  // 既存スケジュール取得
  const fetchExistingSchedules = useCallback(async () => {
    if (!currentStaff) return;

    setLoading(true);
    const scheduleMap = new Map<string, Schedule[]>();

    try {
      // 表示月の全日程のスケジュールを取得
      const promises = calendarDays.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const url = `${getApiUrl()}/api/schedules/unified?date=${dateStr}&includeMasking=false`;
        
        const response = await authenticatedFetch(url);
        if (response.ok) {
          const data = await response.json();
          const filteredSchedules = data.schedules?.filter((schedule: Schedule) => 
            schedule.staffId === currentStaff.id
          ) || [];
          
          if (filteredSchedules.length > 0) {
            scheduleMap.set(dateStr, filteredSchedules);
          }
        }
      });

      await Promise.all(promises);
      setExistingSchedules(scheduleMap);
    } catch (err) {
      console.error('既存スケジュール取得エラー:', err);
      setError('既存スケジュールの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentStaff, calendarDays, getApiUrl, authenticatedFetch]);

  // 初期化
  useEffect(() => {
    if (!authLoading && user) {
      fetchCurrentStaff();
    }
  }, [authLoading, user, fetchCurrentStaff]);

  useEffect(() => {
    if (currentStaff) {
      fetchExistingSchedules();
    }
  }, [currentStaff, selectedMonth, fetchExistingSchedules]);

  // 範囲選択のための状態
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [isRangeSelecting, setIsRangeSelecting] = useState(false);

  // セル選択処理（範囲選択対応）
  const handleCellClick = useCallback((day: Date, isMultiSelect: boolean = false, isShiftSelect: boolean = false) => {
    if (isShiftSelect && rangeStart) {
      // Shift+クリック: 範囲選択
      const start = rangeStart < day ? rangeStart : day;
      const end = rangeStart < day ? day : rangeStart;
      const rangeDays = eachDayOfInterval({ start, end });
      
      setSelectedCells(prev => {
        const newSelection = [...prev];
        rangeDays.forEach(rangeDay => {
          if (!newSelection.some(date => isSameDay(date, rangeDay))) {
            newSelection.push(rangeDay);
          }
        });
        return newSelection;
      });
      setRangeStart(null);
      setIsRangeSelecting(false);
    } else if (isMultiSelect) {
      // Ctrl+クリック: 複数選択
      setSelectedCells(prev => {
        const exists = prev.some(date => isSameDay(date, day));
        if (exists) {
          return prev.filter(date => !isSameDay(date, day));
        } else {
          return [...prev, day];
        }
      });
      setRangeStart(day); // 次の範囲選択の起点として設定
    } else {
      // 通常クリック
      const exists = selectedCells.some(date => isSameDay(date, day));
      if (exists && selectedCells.length === 1) {
        setSelectedCells([]);
        setRangeStart(null);
      } else {
        setSelectedCells([day]);
        setRangeStart(day);
      }
    }
  }, [selectedCells, rangeStart]);

  // プリセット適用処理
  const applyPresetToSelectedDates = useCallback(async (preset: PresetSchedule) => {
    if (!currentStaff || selectedCells.length === 0) return;

    try {
      setLoading(true);
      const url = `${getApiUrl()}/api/schedules`;
      
      // 各選択日に対してプリセットを適用
      for (const date of selectedCells) {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // プリセットの各スケジュールを作成
        for (const schedule of preset.schedules) {
          const newSchedule = {
            staffId: currentStaff.id,
            status: schedule.status,
            start: schedule.startTime,
            end: schedule.endTime,
            memo: schedule.memo || '',
            date: dateStr,
          };

          const response = await authenticatedFetch(url, {
            method: 'POST',
            body: JSON.stringify(newSchedule),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(`${dateStr}への${preset.name}適用エラー:`, errorData);
          }
        }
      }

      // 成功後の処理
      setSelectedCells([]);
      setShowPresetMenu(false);
      setShowConfirmModal(false);
      
      // データを再取得して表示を更新
      await fetchExistingSchedules();
      
      console.log(`${preset.name}を${selectedCells.length}日に適用完了`);
    } catch (error) {
      console.error('プリセット適用エラー:', error);
      setError('予定の設定に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentStaff, selectedCells, getApiUrl, authenticatedFetch, fetchExistingSchedules]);

  // 月変更
  const handleMonthChange = useCallback((direction: 'prev' | 'next') => {
    setSelectedMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    setSelectedCells([]); // 月変更時は選択をリセット
  }, []);

  // 日付のスケジュール取得
  const getSchedulesForDate = useCallback((date: Date): Schedule[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return existingSchedules.get(dateStr) || [];
  }, [existingSchedules]);

  // プリセットメニューの確認処理
  const handlePresetSelection = useCallback((preset: PresetSchedule) => {
    setSelectedPreset(preset);
    setShowPresetMenu(false);
    setShowConfirmModal(true);
  }, []);

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
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="px-6 py-4 border-b">
            <h1 className="text-xl font-semibold text-gray-900">📅 月間予定作成</h1>
            <p className="text-sm text-gray-600 mt-1">
              複数の日付を選択してまとめて予定を設定できます
            </p>
          </div>
          
          {/* 月間ナビゲーション */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button 
                    onClick={() => handleMonthChange('prev')} 
                    className="px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100"
                  >
                    ← 前月
                  </button>
                  <button 
                    onClick={() => setSelectedMonth(new Date())} 
                    className="px-3 py-2 text-sm font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100"
                  >
                    今月
                  </button>
                  <button 
                    onClick={() => handleMonthChange('next')} 
                    className="px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100"
                  >
                    次月 →
                  </button>
                </div>
                
                <h2 className="text-lg font-semibold text-gray-900">
                  {format(selectedMonth, 'yyyy年M月', { locale: ja })}
                </h2>
              </div>

              {/* 承認モードボタン - 管理者のみ表示 */}
              {user?.role === 'ADMIN' && (
                <a
                  href="/admin/pending-approval"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-orange-800 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 transition-colors"
                >
                  🔐 申請承認管理
                </a>
              )}
            </div>

            {/* 選択状態とアクション */}
            <div className="flex items-center space-x-4">
              {selectedCells.length > 0 && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-blue-600 font-medium">
                    {selectedCells.length}日選択中
                  </span>
                  <button
                    onClick={() => setSelectedCells([])}
                    className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    選択解除
                  </button>
                  <button
                    onClick={() => setShowPresetMenu(true)}
                    disabled={selectedCells.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    予定設定
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* カレンダーグリッド */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b">
            {['日', '月', '火', '水', '木', '金', '土'].map((dayName, index) => (
              <div 
                key={dayName}
                className={`p-4 text-center font-medium border-r last:border-r-0 ${
                  index === 0 ? 'text-red-600 bg-red-50' : index === 6 ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* 日付セル */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();
              const isSelected = selectedCells.some(date => isSameDay(date, day));
              const isCurrentDay = isToday(day);
              const daySchedules = getSchedulesForDate(day);
              const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0));
              const dayOfWeek = day.getDay();
              
              return (
                <div
                  key={day.getTime()}
                  className={`min-h-[120px] p-2 border-r border-b last:border-r-0 cursor-pointer transition-colors ${
                    !isCurrentMonth ? 'bg-gray-50 text-gray-400' :
                    isSelected ? 'bg-blue-100 border-blue-300' :
                    isCurrentDay ? 'bg-yellow-50' :
                    isPastDate ? 'bg-gray-100' :
                    dayOfWeek === 0 ? 'bg-red-50' :
                    dayOfWeek === 6 ? 'bg-blue-50' :
                    'bg-white hover:bg-gray-50'
                  }`}
                  onClick={(e) => handleCellClick(day, e.ctrlKey || e.metaKey, e.shiftKey)}
                >
                  {/* 日付 */}
                  <div className={`text-sm font-medium mb-2 ${
                    isCurrentDay ? 'text-yellow-700 font-bold' :
                    dayOfWeek === 0 ? 'text-red-600' :
                    dayOfWeek === 6 ? 'text-blue-600' :
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* 既存スケジュール表示 */}
                  <div className="space-y-1">
                    {daySchedules.slice(0, 3).map((schedule, idx) => (
                      <div
                        key={`${schedule.id}-${idx}`}
                        className={`text-xs px-2 py-1 rounded text-white truncate ${
                          schedule.layer === 'contract' ? 'opacity-60' : ''
                        }`}
                        style={{ backgroundColor: STATUS_COLORS[schedule.status] || '#9ca3af' }}
                        title={`${capitalizeStatus(schedule.status)} ${schedule.memo ? `- ${schedule.memo}` : ''}`}
                      >
                        {capitalizeStatus(schedule.status)}
                      </div>
                    ))}
                    {daySchedules.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{daySchedules.length - 3}件
                      </div>
                    )}
                  </div>

                  {/* 選択インジケーター */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-3 h-3 bg-blue-600 rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 説明とナビゲーション */}
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600 space-y-1 mb-6">
            <p>💡 <strong>使い方:</strong> 日付をクリックして選択 → 「予定設定」ボタンでまとめて設定</p>
            <p>🖱️ <strong>選択方法:</strong></p>
            <ul className="text-xs space-y-1 text-left max-w-md mx-auto">
              <li>• 通常クリック: 単一選択</li>
              <li>• Ctrl/Cmd + クリック: 複数選択</li>
              <li>• Shift + クリック: 範囲選択（最後に選択した日から）</li>
            </ul>
          </div>
          
          <div className="flex justify-center space-x-4">
            <a
              href="/personal"
              className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
            >
              👤 個人ページ
            </a>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              📊 メイン画面
            </a>
          </div>
        </div>
      </div>

      {/* プリセット選択モーダル */}
      {showPresetMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              予定の種類を選択 ({selectedCells.length}日間)
            </h3>
            
            <div className="space-y-2 mb-6">
              {presetSchedules.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelection(preset)}
                  className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{preset.displayName}</div>
                  <div className="text-sm text-gray-500">{preset.timeDisplay}</div>
                </button>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPresetMenu(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確認モーダル */}
      {showConfirmModal && selectedPreset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">予定設定の確認</h3>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                以下の設定で{selectedCells.length}日間に予定を追加します：
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="font-medium text-blue-900">{selectedPreset.displayName}</div>
                <div className="text-sm text-blue-700">{selectedPreset.timeDisplay}</div>
              </div>

              <div className="mt-3 text-sm text-gray-600">
                <strong>対象日付:</strong> {selectedCells.length}日
                {selectedCells.length <= 5 && (
                  <div className="mt-1">
                    {selectedCells.map(date => format(date, 'M/d(E)', { locale: ja })).join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => applyPresetToSelectedDates(selectedPreset)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '設定中...' : '設定実行'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="text-red-800">{error}</div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};

export default MonthlyPlannerPage;