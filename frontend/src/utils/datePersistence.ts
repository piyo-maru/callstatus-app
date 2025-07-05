// 日付永続化ユーティリティ関数
import { useState, useEffect } from 'react';

// ローカルストレージキー定義
export const STORAGE_KEYS = {
  DISPLAY_DATE: 'callstatus_display_date',
  SELECTED_DATE: 'callstatus_selected_date', 
  CURRENT_MONTH: 'callstatus_current_month',
} as const;

/**
 * 日付をローカルストレージに保存
 */
export const saveDateToStorage = (key: string, date: Date): void => {
  try {
    const dateString = date.toISOString();
    localStorage.setItem(key, dateString);
  } catch (error) {
    console.warn('Failed to save date to localStorage:', error);
  }
};

/**
 * ローカルストレージから日付を復元
 */
export const loadDateFromStorage = (key: string, fallbackDate: Date): Date => {
  try {
    const dateString = localStorage.getItem(key);
    if (!dateString) {
      return fallbackDate;
    }
    
    const parsedDate = new Date(dateString);
    // 無効な日付の場合はフォールバックを返す
    if (isNaN(parsedDate.getTime())) {
      console.warn('Invalid date in localStorage, using fallback');
      return fallbackDate;
    }
    
    return parsedDate;
  } catch (error) {
    console.warn('Failed to load date from localStorage:', error);
    return fallbackDate;
  }
};

/**
 * 従来の日付永続化カスタムフック（下位互換性用）
 * @deprecated useSmartPersistentDate を使用してください
 */
export const useLegacyPersistentDate = (
  storageKey: string, 
  defaultDate: Date,
  autoSave: boolean = true
) => {
  // 初期化時にローカルストレージから復元
  const [date, setDate] = useState<Date>(() => {
    return loadDateFromStorage(storageKey, defaultDate);
  });

  // 日付変更時にローカルストレージに保存（autoSaveが有効な場合）
  useEffect(() => {
    if (autoSave) {
      saveDateToStorage(storageKey, date);
    }
  }, [date, storageKey, autoSave]);

  // 手動保存関数
  const saveDate = () => {
    saveDateToStorage(storageKey, date);
  };

  return [date, setDate, saveDate] as const;
};

/**
 * 日付が今日かどうかを判定
 */
const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * 月次計画で「標準月」かどうかを判定（翌月）
 */
const isStandardMonth = (date: Date): boolean => {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return date.getFullYear() === nextMonth.getFullYear() && 
         date.getMonth() === nextMonth.getMonth();
};

/**
 * 前回保存時から日付が変わったかを検出
 */
const hasDateChanged = (storageKey: string): boolean => {
  try {
    const savedTimestamp = localStorage.getItem(storageKey + '_timestamp');
    if (!savedTimestamp) return false;
    
    const savedDate = new Date(parseInt(savedTimestamp));
    const today = new Date();
    return savedDate.toDateString() !== today.toDateString();
  } catch {
    return false;
  }
};

/**
 * スマート永続化フック
 * 今日の日付のみlocalStorage、過去/未来はsessionStorageで一時保持
 */
export const useSmartPersistentDate = (
  storageKey: string,
  getDefaultDate: () => Date
) => {
  // 初期化時の復元ロジック
  const [date, setDate] = useState<Date>(() => {
    const defaultDate = getDefaultDate();
    
    // 日付変更チェック（午前0時跨ぎ）
    if (hasDateChanged(storageKey)) {
      // 日付が変わっていたら過去の永続化データをクリア
      localStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey + '_timestamp');
      sessionStorage.removeItem(storageKey + '_temp');
      return defaultDate;
    }
    
    // 1. 一時的な日付（sessionStorage）を優先チェック
    try {
      const tempDateString = sessionStorage.getItem(storageKey + '_temp');
      if (tempDateString) {
        const tempDate = new Date(tempDateString);
        if (!isNaN(tempDate.getTime())) {
          return tempDate;
        }
      }
    } catch (error) {
      console.warn('Failed to load temp date:', error);
    }
    
    // 2. 永続化された日付をチェック（今日/標準月のみ）
    try {
      const persistedDateString = localStorage.getItem(storageKey);
      if (persistedDateString) {
        const persistedDate = new Date(persistedDateString);
        if (!isNaN(persistedDate.getTime())) {
          return persistedDate;
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted date:', error);
    }
    
    // 3. デフォルト日付を返す
    return defaultDate;
  });

  // 日付変更時の保存ロジック
  useEffect(() => {
    const isStandardDate = storageKey === STORAGE_KEYS.CURRENT_MONTH ? 
      isStandardMonth(date) : isToday(date);
    
    if (isStandardDate) {
      // 今日/標準月なら永続化
      try {
        localStorage.setItem(storageKey, date.toISOString());
        localStorage.setItem(storageKey + '_timestamp', Date.now().toString());
        sessionStorage.removeItem(storageKey + '_temp');
      } catch (error) {
        console.warn('Failed to persist date:', error);
      }
    } else {
      // 過去/未来日付なら一時保存のみ
      try {
        sessionStorage.setItem(storageKey + '_temp', date.toISOString());
      } catch (error) {
        console.warn('Failed to save temp date:', error);
      }
    }
  }, [date, storageKey]);

  return [date, setDate] as const;
};

/**
 * 月次計画用スマートカスタムフック
 * デフォルトで翌月を表示、翌月は永続化、他の月は一時的
 */
export const useMonthlyPlannerDate = () => {
  const getDefaultMonth = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  };

  return useSmartPersistentDate(STORAGE_KEYS.CURRENT_MONTH, getDefaultMonth);
};

/**
 * 出社状況ページ用スマートカスタムフック
 * 今日の日付のみ永続化、過去日付は一時的
 */
export const useMainAppDate = () => {
  return useSmartPersistentDate(STORAGE_KEYS.DISPLAY_DATE, () => new Date());
};

/**
 * 個人ページ用スマートカスタムフック
 * 今日の日付のみ永続化、過去日付は一時的
 */
export const usePersonalPageDate = () => {
  return useSmartPersistentDate(STORAGE_KEYS.SELECTED_DATE, () => new Date());
};

/**
 * 日付永続化カスタムフック（スマート版に自動移行）
 * 今日/標準月は永続化、過去/未来は一時的に保持
 */
export const usePersistentDate = (
  storageKey: string, 
  defaultDate: Date,
  _autoSave: boolean = true // 下位互換性のため残すが使用されない
) => {
  return useSmartPersistentDate(storageKey, () => defaultDate);
};

/**
 * 開発・テスト用ユーティリティ関数
 * ブラウザコンソールで手動テスト可能
 */
export const debugSmartPersistence = () => {
  const checkStorage = (key: string, label: string) => {
    const localStorage_data = localStorage.getItem(key);
    const localStorage_timestamp = localStorage.getItem(key + '_timestamp');
    const sessionStorage_data = sessionStorage.getItem(key + '_temp');
    
    console.log(`📊 ${label}:`);
    console.log(`  localStorage: ${localStorage_data ? new Date(localStorage_data).toLocaleString() : '未保存'}`);
    console.log(`  localStorage timestamp: ${localStorage_timestamp ? new Date(parseInt(localStorage_timestamp)).toLocaleString() : '未保存'}`);
    console.log(`  sessionStorage: ${sessionStorage_data ? new Date(sessionStorage_data).toLocaleString() : '未保存'}`);
    console.log('---');
  };
  
  console.log('🔍 スマート永続化ストレージ状況:');
  checkStorage(STORAGE_KEYS.DISPLAY_DATE, '出社状況ページ');
  checkStorage(STORAGE_KEYS.SELECTED_DATE, '個人ページ');
  checkStorage(STORAGE_KEYS.CURRENT_MONTH, '月次計画ページ');
  
  console.log('💡 テスト方法:');
  console.log('1. 各ページで過去日付に変更 → ページリロード → 今日に戻ることを確認');
  console.log('2. 今日の日付に設定 → ページリロード → 今日のまま維持されることを確認');
  console.log('3. 過去日付に変更 → 別タブで開く → 同じ過去日付で開くことを確認');
  console.log('4. ブラウザ完全再起動 → 今日に戻ることを確認');
};

// 開発環境でグローバルに公開
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugSmartPersistence = debugSmartPersistence;
}