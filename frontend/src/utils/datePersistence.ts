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
 * 日付永続化カスタムフック
 * @param storageKey ローカルストレージのキー
 * @param defaultDate デフォルト日付（初回表示時やローカルストレージがない場合）
 * @param autoSave 日付変更時に自動保存するかどうか（デフォルト: true）
 */
export const usePersistentDate = (
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
 * 月次計画用カスタムフック
 * デフォルトで翌月を表示するが、前回閲覧月があれば復元
 */
export const useMonthlyPlannerDate = () => {
  const getDefaultMonth = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  };

  return usePersistentDate(STORAGE_KEYS.CURRENT_MONTH, getDefaultMonth());
};

/**
 * 出社状況ページ用カスタムフック
 */
export const useMainAppDate = () => {
  return usePersistentDate(STORAGE_KEYS.DISPLAY_DATE, new Date());
};

/**
 * 個人ページ用カスタムフック
 */
export const usePersonalPageDate = () => {
  return usePersistentDate(STORAGE_KEYS.SELECTED_DATE, new Date());
};