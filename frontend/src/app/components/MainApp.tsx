'use client';

// 元のアプリケーションのインポートを追加
import { useState, useEffect, useMemo, useCallback, Fragment, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from './AuthProvider';

// カレンダーの表示言語を日本語に設定
registerLocale('ja', ja);

// 認証対応のAPI呼び出しヘルパー
export function useAuthenticatedAPI() {
  const { token, logout } = useAuth();

  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

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

  return { apiCall };
}

// 基本的な型定義（元のアプリケーションから）
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
  isActive?: boolean;
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

// メインアプリケーションコンポーネント
export default function MainApp() {
  const { user, logout } = useAuth();
  const { apiCall } = useAuthenticatedAPI();
  
  // 基本的な状態管理
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // API URL取得
  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:3002';
      } else {
        return `http://${host}:3002`;
      }
    }
    return 'http://localhost:3002';
  };

  // データ取得
  const fetchData = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      setError('');

      const dateString = date.toISOString().split('T')[0];
      const response = await apiCall(`${getApiUrl()}/api/schedules/layered?date=${dateString}`);
      
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const data = await response.json();
      setStaff(data.staff || []);
      setSchedules(data.schedules || []);
      
    } catch (err: any) {
      console.error('Data fetch error:', err);
      setError(err.message || 'データの取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // 初回データ取得
  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  // ヘッダーコンポーネント
  const AuthHeader = () => (
    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex justify-between items-center">
      <h1 className="text-lg font-semibold text-gray-900">
        出社状況管理ボード
      </h1>
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">
          {user?.name || user?.email} ({user?.role === 'ADMIN' ? '管理者' : '一般ユーザー'})
        </span>
        <button
          onClick={logout}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded border"
        >
          ログアウト
        </button>
      </div>
    </div>
  );

  // 基本的なスケジュール表示
  const ScheduleView = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">スケジュール管理</h2>
          <div className="flex items-center space-x-4">
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => date && setSelectedDate(date)}
              dateFormat="yyyy年MM月dd日"
              locale="ja"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={() => fetchData(selectedDate)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              更新
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-600">読み込み中...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">スタッフ一覧</h3>
                <div className="space-y-2">
                  {staff.map((s) => (
                    <div key={s.id} className="p-3 bg-gray-50 rounded border">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-sm text-gray-600">
                        {s.department} - {s.group}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">本日のスケジュール</h3>
                <div className="space-y-2">
                  {schedules.map((schedule) => {
                    const staffMember = staff.find(s => s.id === schedule.staffId);
                    return (
                      <div key={schedule.id} className="p-3 bg-blue-50 rounded border">
                        <div className="font-medium">{staffMember?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-600">
                          {schedule.status} ({schedule.start}:00 - {schedule.end}:00)
                          {schedule.layer === 'contract' && ' [契約]'}
                        </div>
                        {schedule.memo && (
                          <div className="text-sm text-gray-500 mt-1">{schedule.memo}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-50 rounded border">
              <h3 className="font-medium text-green-900">認証状態</h3>
              <div className="mt-2 text-sm text-green-700">
                <div>ユーザー: {user?.name || user?.email}</div>
                <div>権限: {user?.role === 'ADMIN' ? '管理者（全機能利用可能）' : '一般ユーザー（閲覧・自分の予定編集）'}</div>
                <div>スタッフ数: {staff.length}</div>
                <div>スケジュール数: {schedules.length}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader />
      <div className="p-6">
        <ScheduleView />
      </div>
    </div>
  );
}