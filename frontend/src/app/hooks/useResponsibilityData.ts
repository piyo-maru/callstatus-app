'use client';

import { useState, useCallback } from 'react';
import { format, eachDayOfInterval } from 'date-fns';
import { getApiUrl } from '../components/constants/MainAppConstants';
import type { ResponsibilityData } from '../types/responsibility';
import { createResponsibilityKey } from '../utils/responsibilityUtils';

/**
 * 統一担当設定データ管理フック
 * 全ページで同一のデータ操作ロジックを提供
 */
export const useResponsibilityData = (customAuthenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>) => {
  const [responsibilityData, setResponsibilityData] = useState<{ [key: string]: ResponsibilityData }>({});
  
  // デフォルトのfetch関数（認証トークン付き）
  const defaultAuthenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers
    });
  }, []);
  
  const authenticatedFetch = customAuthenticatedFetch || defaultAuthenticatedFetch;
  
  // 指定日の担当設定データを取得
  const fetchResponsibilities = useCallback(async (date: string) => {
    try {
      const response = await authenticatedFetch(`${getApiUrl()}/api/responsibilities?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        return data.responsibilities || [];
      }
    } catch (error) {
      console.error('担当設定取得エラー:', error);
    }
    return [];
  }, [authenticatedFetch]);
  
  // 担当設定データを保存
  const saveResponsibility = useCallback(async (
    staffId: number, 
    date: string, 
    responsibilities: ResponsibilityData
  ): Promise<boolean> => {
    try {
      const response = await authenticatedFetch(`${getApiUrl()}/api/responsibilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, date, responsibilities })
      });
      
      if (!response.ok) {
        throw new Error('担当設定の保存に失敗しました');
      }
      
      // 状態を即座に更新
      const key = `${staffId}-${date}`;
      setResponsibilityData(prev => ({
        ...prev,
        [key]: responsibilities
      }));
      
      console.log('担当設定保存完了:', { staffId, date, responsibilities });
      return true;
    } catch (error) {
      console.error('担当設定保存エラー:', error);
      return false;
    }
  }, [authenticatedFetch]);
  
  // 月全体の担当設定データを読み込み
  const loadMonthResponsibilities = useCallback(async (
    staffId: number, 
    startDate: Date, 
    endDate: Date
  ) => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const responsibilityMap: { [key: string]: ResponsibilityData } = {};
    
    for (const day of days) {
      const dateString = format(day, 'yyyy-MM-dd');
      
      try {
        const responsibilities = await fetchResponsibilities(dateString);
        
        responsibilities.forEach((item: any) => {
          if (item.staffId === staffId && item.responsibilities) {
            const key = createResponsibilityKey(staffId, day);
            responsibilityMap[key] = item.responsibilities;
          }
        });
      } catch (error) {
        console.error(`担当設定データ取得エラー (${dateString}):`, error);
      }
    }
    
    setResponsibilityData(prev => ({ ...prev, ...responsibilityMap }));
  }, [fetchResponsibilities]);
  
  // 単一日付の担当設定データを読み込み
  const loadSingleDateResponsibilities = useCallback(async (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    try {
      const responsibilities = await fetchResponsibilities(dateString);
      const responsibilityMap: { [key: string]: ResponsibilityData } = {};
      
      responsibilities.forEach((item: any) => {
        if (item.staffId && item.responsibilities) {
          const key = createResponsibilityKey(item.staffId, date);
          responsibilityMap[key] = item.responsibilities;
        }
      });
      
      setResponsibilityData(prev => ({ ...prev, ...responsibilityMap }));
    } catch (error) {
      console.error(`担当設定データ取得エラー (${dateString}):`, error);
    }
  }, [fetchResponsibilities]);
  
  // 指定スタッフ・日付の担当設定データを取得
  const getResponsibilityForDate = useCallback((
    staffId: number, 
    date: Date
  ): ResponsibilityData | null => {
    const key = createResponsibilityKey(staffId, date);
    return responsibilityData[key] || null;
  }, [responsibilityData]);
  
  // 担当設定データをクリア
  const clearResponsibilityData = useCallback(() => {
    setResponsibilityData({});
  }, []);
  
  return {
    responsibilityData,
    saveResponsibility,
    loadMonthResponsibilities,
    loadSingleDateResponsibilities,
    getResponsibilityForDate,
    clearResponsibilityData,
    fetchResponsibilities
  };
};