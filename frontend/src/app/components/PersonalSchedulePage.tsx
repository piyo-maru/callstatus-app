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
  capitalizeStatus
} from './timeline/TimelineUtils';

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

// ユーティリティ関数（TimelineUtilsから使用）
const availableStatuses = ['online', 'remote', 'meeting', 'training', 'break', 'off', 'unplanned', 'night duty'];

const PersonalSchedulePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateForPreset, setSelectedDateForPreset] = useState<Date | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  
  
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

  // プリセット予定（指定された内容）
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
      name: '夜間', 
      displayName: '夜間',
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
      timeDisplay: '09:00-18:00',
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

  // 月間の日付リストを生成
  const monthDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // TimelineUtilsの関数を使用（既にインポート済み）

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
          
          // 取得したスケジュールに日付情報を追加
          const schedulesWithDate = filteredSchedules.map(schedule => ({
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
      console.log('全スケジュール取得完了:', allSchedules.length, '件');
      
      // デバッグログ削除（無限ループ防止）
      
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

  // プリセット予定を追加（複数スケジュール対応）
  const addPresetSchedule = useCallback(async (preset: PresetSchedule, targetDate: Date) => {
    if (!currentStaff) {
      console.error('社員情報が設定されていません');
      setError('社員情報が設定されていません');
      return;
    }

    const dateStr = format(targetDate, 'yyyy-MM-dd');
    console.log('プリセット予定追加:', {
      preset: preset.name,
      targetDate: dateStr,
      currentStaff: currentStaff.name,
      schedulesCount: preset.schedules.length
    });
    
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

        console.log('送信データ:', newSchedule);

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
        console.log('追加成功:', result);
      }
      
      // 全スケジュール追加後にデータを再取得
      await fetchSchedules();
      
      // 成功メッセージ
      setError(null);
      console.log(`${preset.name}を追加しました（${preset.schedules.length}件）`);
      
    } catch (err) {
      console.error('スケジュール追加エラー:', err);
      setError(`${preset.name}の追加に失敗しました`);
    }
  }, [currentStaff, getApiUrl, authenticatedFetch, fetchSchedules]);

  // スケジュール保存ハンドラー（メイン画面と同じ）
  const handleSaveSchedule = useCallback(async (scheduleData: Schedule & { id?: number | string; date?: string }) => {
    console.log('スケジュール保存:', scheduleData);
    
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
            console.log('スケジュール作成成功');
            await fetchSchedules();
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
            console.log('スケジュール更新成功');
            await fetchSchedules();
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
          console.log('スケジュール作成成功');
          await fetchSchedules();
          setIsModalOpen(false);
          setDraggedSchedule(null);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'スケジュールの作成に失敗しました');
        }
      }
    } catch (err) {
      console.error('スケジュール保存エラー:', err);
      setError('スケジュールの保存中にエラーが発生しました');
    }
  }, [currentStaff, getApiUrl, authenticatedFetch, fetchSchedules]);

  // スケジュール削除ハンドラー
  const handleDeleteSchedule = useCallback(async (scheduleId: number | string) => {
    console.log('スケジュール削除:', scheduleId, typeof scheduleId);
    
    try {
      let actualId: number;
      
      if (typeof scheduleId === 'string') {
        // 統合API形式のIDから実際のIDを抽出
        // 形式: adjustment_{adj|sch}_{実際のID}_{配列インデックス}
        const parts = scheduleId.split('_');
        if (parts.length >= 3) {
          actualId = parseInt(parts[2], 10);
          console.log('統合ID形式から数値ID抽出:', scheduleId, '->', actualId);
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
        console.log('スケジュール削除成功');
        await fetchSchedules();
        setDeletingScheduleId(null);
        setSelectedSchedule(null); // 選択解除
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'スケジュールの削除に失敗しました');
      }
    } catch (err) {
      console.error('スケジュール削除エラー:', err);
      setError('スケジュールの削除中にエラーが発生しました');
    }
  }, [getApiUrl, authenticatedFetch, fetchSchedules]);

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

  // タイムライン上でのドラッグ開始処理
  const handleTimelineMouseDown = useCallback((e: React.MouseEvent, day: Date) => {
    if (!currentStaff) return;
    
    // スケジュール要素のonMouseDownで既にstopPropagation()されているので
    // ここに到達するのは空の領域または契約レイヤーの背景をクリックした場合のみ
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    
    console.log('タイムラインドラッグ開始:', { day: format(day, 'yyyy-MM-dd'), startX });
    
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
      console.log('ドラッグ終了:', { dragDistance });

      if (dragDistance < 10) {
        console.log('ドラッグ距離不足、キャンセル');
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

      console.log('時刻変換:', { start, end, snappedStart, snappedEnd });

      if (snappedStart < snappedEnd && snappedStart >= 8 && snappedEnd <= 21) {
        console.log('予定作成モーダルを開く');
        // 予定作成モーダルを開く
        setDraggedSchedule({
          staffId: dragInfo.staff.id,
          status: 'online',
          start: snappedStart,
          end: snappedEnd,
          date: format(dragInfo.day, 'yyyy-MM-dd')
        });
        setIsModalOpen(true);
      } else {
        console.log('時刻範囲が無効:', { snappedStart, snappedEnd });
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
  const handleScheduleClick = useCallback((schedule: Schedule, scheduleLayer: string) => {
    if (schedule.layer === 'contract') return; // 契約レイヤーは編集不可
    
    const currentSelection = selectedSchedule;
    if (currentSelection && 
        currentSelection.schedule.id === schedule.id && 
        currentSelection.layer === scheduleLayer) {
      // 同じ予定を再クリック → 編集モーダルを開く
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
                className="p-3 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">{preset.displayName}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {preset.timeDisplay}
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

        {/* 月間ガントチャート（メイン画面スタイル） */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">月間スケジュール</h3>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-[1300px]">
              {/* 時間軸ヘッダー（メイン画面と同じ） */}
              <div className="sticky top-0 z-10 bg-gray-100 border-b overflow-hidden">
                <div className="flex font-bold text-sm">
                  <div className="w-24 text-left pl-2 border-r py-2 bg-gray-50">
                    日付
                  </div>
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

              {/* 日付行（メイン画面スタイル） */}
              {monthDays.map((day) => {
                // デバッグ：日付フィルタリングの詳細
                const dayStr = format(day, 'yyyy-MM-dd');
                const daySchedules = schedules.filter(schedule => {
                  // スケジュールにdateフィールドがある場合はそれを使用
                  if (schedule.date) {
                    return schedule.date === dayStr;
                  }
                  // startがDateオブジェクトの場合
                  if (schedule.start instanceof Date) {
                    return isSameDay(schedule.start, day);
                  }
                  // startが文字列の場合
                  if (typeof schedule.start === 'string') {
                    return isSameDay(new Date(schedule.start), day);
                  }
                  // その他の場合（数値など）- この場合は日付が不明なのでfalse
                  return false;
                });
                
                // デバッグログ削除（無限ループ防止）
                
                const isCurrentDay = isToday(day);
                
                return (
                  <div key={day.getTime()} className="flex border-b border-gray-100 hover:bg-gray-50 h-[45px] relative">
                    {/* 日付列 */}
                    <div 
                      className={`w-24 p-3 border-r border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors flex flex-col justify-center ${
                        isCurrentDay ? 'bg-blue-50 font-semibold text-blue-900' : ''
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
                        {format(day, 'M/d E', { locale: ja })}
                      </div>
                      {selectedDateForPreset && isSameDay(selectedDateForPreset, day) && (
                        <div className="text-xs text-blue-600 mt-1">📌 選択中</div>
                      )}
                    </div>

                    {/* タイムライン（メイン画面と同じスタイル） */}
                    <div 
                      className="flex-1 relative hover:bg-gray-50"
                      onMouseDown={(e) => handleTimelineMouseDown(e, day)}
                      style={{ cursor: dragInfo ? 'grabbing' : 'crosshair' }}
                    >
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

                      {/* 15分単位の目盛り線 */}
                      {(() => {
                        const markers = [];
                        for (let hour = 8; hour <= 21; hour++) {
                          for (let minute = 0; minute < 60; minute += 15) {
                            if (hour === 21 && minute > 0) break;
                            const time = hour + minute / 60;
                            const position = timeToPositionPercent(time);
                            const timeString = `${hour}:${String(minute).padStart(2, '0')}`;
                            
                            markers.push(
                              <div
                                key={`${hour}-${minute}`}
                                className="absolute top-0 bottom-0 w-0.5 border-l border-gray-300 z-5 opacity-50"
                                style={{ left: `${position}%` }}
                                title={timeString}
                              />
                            );
                          }
                        }
                        return markers;
                      })()}


                      {/* スケジュールバー（メイン画面と同じスタイル） */}
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
                        const isHistorical = schedule.layer === 'historical' || schedule.isHistorical;
                        const scheduleLayer = schedule.layer || 'adjustment';
                        const isSelected = selectedSchedule && 
                          selectedSchedule.schedule.id === schedule.id && 
                          selectedSchedule.layer === scheduleLayer;

                        return (
                          <div
                            key={`${schedule.id}-${schedule.layer}-${index}`}
                            data-layer={scheduleLayer}
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
                              backgroundColor: STATUS_COLORS[schedule.status] || STATUS_COLORS.online,
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
                                handleScheduleClick(schedule, scheduleLayer);
                              }
                            }}
                            onMouseDown={(e) => {
                              // 調整レイヤーのみイベント伝播を停止（編集可能な予定）
                              // 契約レイヤーは背景扱いなのでドラッグを許可
                              if (!isContract && !isHistorical) {
                                e.stopPropagation();
                                console.log('調整レイヤー要素マウスダウン - ドラッグ処理回避');
                              } else {
                                console.log('契約レイヤー要素マウスダウン - ドラッグ許可');
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

                      {/* メイン画面と同じドラッグプレビュー */}
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
          {(selectedStatus === 'meeting' || selectedStatus === 'training') && (
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

export default PersonalSchedulePage;