'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from './AuthProvider';

interface Schedule {
  id: number;
  status: string;
  start: Date;
  end: Date;
  memo?: string;
  layer?: 'contract' | 'adjustment';
  staffId: number;
  staffName: string;
  staffDepartment: string;
  staffGroup: string;
  empNo?: string;
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
  status: string;
  startTime: number; // 小数点時刻（例: 9.5 = 9:30）
  endTime: number;
  memo?: string;
}

interface PresetButtonProps {
  preset: PresetSchedule;
  targetDate: Date;
  onAdd: (preset: PresetSchedule, date: Date) => void;
  disabled?: boolean;
}

const PersonalSchedulePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateForPreset, setSelectedDateForPreset] = useState<Date | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);

  // プリセット予定（後で管理画面から設定可能にする）
  const presetSchedules: PresetSchedule[] = [
    { id: 'online-full', name: '通常勤務(9:00-18:00)', status: 'online', startTime: 9, endTime: 18 },
    { id: 'online-morning', name: '午前勤務(9:00-13:00)', status: 'online', startTime: 9, endTime: 13 },
    { id: 'online-afternoon', name: '午後勤務(13:00-18:00)', status: 'online', startTime: 13, endTime: 18 },
    { id: 'remote-full', name: 'リモート勤務(9:00-18:00)', status: 'remote', startTime: 9, endTime: 18 },
    { id: 'meeting-2h', name: '会議(2時間)', status: 'meeting', startTime: 10, endTime: 12 },
    { id: 'training-4h', name: '研修(4時間)', status: 'training', startTime: 9, endTime: 13 },
    { id: 'off-day', name: '休暇', status: 'off', startTime: 0, endTime: 24 },
  ];

  // 月間の日付リストを生成
  const monthDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // APIベースURLを取得
  const getApiUrl = useCallback((): string => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3002';
      } else {
        return `http://${hostname}:3002`;
      }
    }
    return '';
  }, []);

  // 認証付きfetch
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('access_token');
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
  }, []);

  // 現在のユーザーの社員情報を取得
  const fetchCurrentStaff = useCallback(async () => {
    if (!user?.email) {
      console.error('ユーザー情報が取得できません');
      return;
    }

    try {
      console.log('API URL:', getApiUrl());
      console.log('ユーザーメール:', user.email);
      
      const response = await authenticatedFetch(`${getApiUrl()}/api/staff`);
      console.log('スタッフAPI レスポンス状態:', response.status);
      
      if (response.ok) {
        const staffList: Staff[] = await response.json();
        console.log('取得したスタッフリスト:', staffList);
        
        // ユーザーメールから社員を検索
        let userStaff = staffList.find(staff => {
          // Contract テーブルのemailとマッチング
          return staff.name.includes(user.email.split('@')[0]) || 
                 staff.empNo === user.email.split('@')[0];
        });
        
        if (!userStaff && staffList.length > 0) {
          console.log('ユーザーに対応する社員が見つからないため、最初の社員を使用');
          userStaff = staffList[0];
        }
        
        if (userStaff) {
          console.log('選択された社員:', userStaff);
          setCurrentStaff(userStaff);
        } else {
          setError('対応する社員情報が見つかりません');
        }
      } else {
        const errorText = await response.text();
        console.error('スタッフAPI エラー:', response.status, errorText);
        setError(`社員情報の取得に失敗しました: ${response.status}`);
      }
    } catch (err) {
      console.error('社員情報の取得に失敗:', err);
      setError('社員情報の取得中にエラーが発生しました');
    }
  }, [user, getApiUrl, authenticatedFetch]);

  // スケジュールデータを取得
  const fetchSchedules = useCallback(async () => {
    if (!currentStaff) {
      console.log('currentStaffが設定されていないため、スケジュール取得をスキップ');
      return;
    }

    console.log('スケジュール取得開始:', {
      currentStaff: currentStaff.name,
      staffId: currentStaff.id,
      monthDays: monthDays.length
    });

    setLoading(true);
    setError(null);

    try {
      const promises = monthDays.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const url = `${getApiUrl()}/api/schedules/unified?date=${dateStr}&includeMasking=false`;
        console.log(`API呼び出し: ${url}`);
        
        const response = await authenticatedFetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`${dateStr}のレスポンス:`, data);
          
          const filteredSchedules = data.schedules?.filter((schedule: Schedule) => 
            schedule.staffId === currentStaff.id
          ) || [];
          
          console.log(`${dateStr}のフィルター後スケジュール:`, filteredSchedules);
          return filteredSchedules;
        } else {
          console.error(`${dateStr}のAPI呼び出し失敗:`, response.status);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const allSchedules = results.flat();
      console.log('全スケジュール取得完了:', {
        総件数: allSchedules.length,
        スケジュール: allSchedules
      });
      
      setSchedules(allSchedules);
    } catch (err) {
      console.error('スケジュールの取得に失敗:', err);
      setError('スケジュールの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentStaff, monthDays, getApiUrl, authenticatedFetch]);

  // 初期化処理
  useEffect(() => {
    if (!authLoading && user) {
      fetchCurrentStaff();
    }
  }, [authLoading, user, fetchCurrentStaff]);

  useEffect(() => {
    if (currentStaff) {
      fetchSchedules();
    }
  }, [currentStaff, fetchSchedules]);

  // プリセット予定を追加
  const addPresetSchedule = useCallback(async (preset: PresetSchedule, targetDate: Date) => {
    if (!currentStaff) {
      console.error('社員情報が設定されていません');
      setError('社員情報が設定されていません');
      return;
    }

    const dateStr = format(targetDate, 'yyyy-MM-dd');
    console.log('プリセット予定追加:', {
      preset,
      targetDate: dateStr,
      currentStaff: currentStaff.name
    });
    
    try {
      const newSchedule = {
        staffId: currentStaff.id,
        status: preset.status,
        start: preset.startTime,
        end: preset.endTime,
        memo: preset.memo || '',
        date: dateStr,
      };

      console.log('送信データ:', newSchedule);
      const url = `${getApiUrl()}/api/schedules`;
      console.log('API URL:', url);

      const response = await authenticatedFetch(url, {
        method: 'POST',
        body: JSON.stringify(newSchedule),
      });

      console.log('追加レスポンス:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('追加成功:', result);
        
        // スケジュールを再取得
        await fetchSchedules();
        
        // 成功メッセージ（3秒後に自動で消す）
        setError(null);
        console.log('プリセット予定を追加しました');
      } else {
        const errorData = await response.json();
        console.error('追加エラー:', errorData);
        setError(errorData.message || 'スケジュールの追加に失敗しました');
      }
    } catch (err) {
      console.error('スケジュール追加エラー:', err);
      setError('スケジュールの追加に失敗しました');
    }
  }, [currentStaff, getApiUrl, authenticatedFetch, fetchSchedules]);

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
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">個人スケジュール</h1>
              <p className="text-gray-600 mt-1">
                {currentStaff.name} ({currentStaff.department} - {currentStaff.group})
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleMonthChange('prev')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                ←
              </button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[120px] text-center">
                {format(selectedDate, 'yyyy年M月', { locale: ja })}
              </h2>
              <button
                onClick={() => handleMonthChange('next')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                →
              </button>
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">クイック予定追加</h3>
          <div className="mb-4 text-sm text-gray-600">
            📌 今日の予定を追加、または下の日付をクリックして特定の日に追加
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {presetSchedules.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  const targetDate = selectedDateForPreset || new Date();
                  addPresetSchedule(preset, targetDate);
                }}
                className="p-3 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderLeftColor: getStatusColor(preset.status), borderLeftWidth: '4px' }}
              >
                <div className="font-medium text-gray-900">{preset.name}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {preset.status === 'off' ? '終日' : `${formatTime(preset.startTime)}-${formatTime(preset.endTime)}`}
                </div>
              </button>
            ))}
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

        {/* 月間ガントチャート */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">月間スケジュール</h3>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* ヘッダー：時間軸 */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                <div className="w-24 p-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                  日付
                </div>
                {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => (
                  <div key={hour} className="w-16 p-2 text-xs text-center text-gray-600 border-r border-gray-200">
                    {hour}:00
                  </div>
                ))}
              </div>

              {/* 日付行 */}
              {monthDays.map((day) => {
                const daySchedules = schedules.filter(schedule => 
                  isSameDay(new Date(schedule.start), day)
                );
                
                return (
                  <div key={day.getTime()} className="flex border-b border-gray-100 hover:bg-gray-50">
                    {/* 日付列 */}
                    <div 
                      className={`w-24 p-3 border-r border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors ${
                        isToday(day) ? 'bg-blue-50 font-semibold text-blue-900' : ''
                      } ${
                        selectedDateForPreset && isSameDay(selectedDateForPreset, day) ? 'bg-blue-100 border-blue-300' : ''
                      }`}
                      onClick={() => {
                        if (selectedDateForPreset && isSameDay(selectedDateForPreset, day)) {
                          setSelectedDateForPreset(null);
                        } else {
                          setSelectedDateForPreset(day);
                        }
                      }}
                    >
                      <div className="text-sm">
                        {format(day, 'M/d', { locale: ja })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(day, 'E', { locale: ja })}
                      </div>
                      {selectedDateForPreset && isSameDay(selectedDateForPreset, day) && (
                        <div className="text-xs text-blue-600 mt-1">📌 選択中</div>
                      )}
                    </div>

                    {/* タイムライン */}
                    <div className="flex-1 relative h-16">
                      {/* 時間グリッド */}
                      {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => (
                        <div
                          key={hour}
                          className="absolute top-0 bottom-0 w-16 border-r border-gray-200"
                          style={{ left: `${(hour - 8) * 64}px` }}
                        />
                      ))}

                      {/* スケジュールバー */}
                      {daySchedules.map((schedule, index) => {
                        // メイン画面と同じ時刻変換ロジックを使用
                        let startHour: number;
                        let endHour: number;
                        
                        if (typeof schedule.start === 'number') {
                          // 既に小数点時刻の場合
                          startHour = schedule.start;
                          endHour = schedule.end as number;
                        } else {
                          // Date型の場合、小数点時刻に変換
                          const startDate = new Date(schedule.start);
                          const endDate = new Date(schedule.end);
                          startHour = startDate.getHours() + startDate.getMinutes() / 60;
                          endHour = endDate.getHours() + endDate.getMinutes() / 60;
                        }
                        
                        console.log(`スケジュール${schedule.id}:`, {
                          status: schedule.status,
                          start: schedule.start,
                          end: schedule.end,
                          startHour,
                          endHour,
                          layer: schedule.layer
                        });

                        const left = Math.max(0, (startHour - 8) * 64);
                        const width = Math.max(16, (endHour - Math.max(8, startHour)) * 64);
                        const isContract = schedule.layer === 'contract';
                        const isHistorical = schedule.layer === 'historical' || schedule.isHistorical;

                        return (
                          <div
                            key={schedule.id}
                            className={`absolute h-8 rounded text-white text-xs flex items-center px-2 ${
                              isContract ? 'opacity-50' : ''
                            } ${
                              isHistorical ? 'border-2 border-dashed border-amber-400' : ''
                            }`}
                            style={{
                              left: `${left}px`,
                              width: `${width}px`,
                              top: `${4 + index * 20}px`,
                              backgroundColor: getStatusColor(schedule.status),
                              backgroundImage: isContract 
                                ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.2) 4px, rgba(255,255,255,0.2) 8px)' 
                                : isHistorical 
                                ? 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 16px)'
                                : 'none',
                              zIndex: isContract ? 10 : isHistorical ? 15 : 30,
                            }}
                          >
                            <span className="truncate">
                              {schedule.status} {schedule.memo && `(${schedule.memo})`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
};

export default PersonalSchedulePage;