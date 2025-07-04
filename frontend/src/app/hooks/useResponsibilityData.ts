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
  
  // 月全体の担当設定データを読み込み（効率化版）
  const loadMonthResponsibilities = useCallback(async (
    staffId: number, 
    startDate: Date, 
    endDate: Date
  ) => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const responsibilityMap: { [key: string]: ResponsibilityData } = {};
    
    // 日付別にAPIキャッシュを作成（同じ日付の重複API呼び出しを防ぐ）
    const dateCache: { [dateString: string]: any[] } = {};
    
    for (const day of days) {
      const dateString = format(day, 'yyyy-MM-dd');
      
      try {
        // キャッシュにない場合のみAPI呼び出し
        if (!dateCache[dateString]) {
          dateCache[dateString] = await fetchResponsibilities(dateString);
        }
        
        const responsibilities = dateCache[dateString];
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
  
  // 単一日付の担当設定データを読み込み（データマップを返す）
  const loadSingleDateResponsibilities = useCallback(async (date: Date): Promise<{ [key: string]: ResponsibilityData }> => {
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
      return responsibilityMap; // 取得したデータを直接返す
    } catch (error) {
      console.error(`担当設定データ取得エラー (${dateString}):`, error);
      return {}; // エラー時は空オブジェクトを返す
    }
  }, [fetchResponsibilities]);
  
  // 指定スタッフ・日付の担当設定データを取得
  const getResponsibilityForDate = useCallback((
    staffId: number, 
    date: Date
  ): ResponsibilityData | null => {
    const key = createResponsibilityKey(staffId, date);
    const result = responsibilityData[key] || null;
    return result;
  }, [responsibilityData]);
  
  // 担当設定データをクリア
  const clearResponsibilityData = useCallback(() => {
    setResponsibilityData({});
  }, []);
  
  // 月次プランナー専用：全スタッフの月全体データを一括読み込み
  const loadAllStaffMonthResponsibilities = useCallback(async (
    staffList: { id: number }[],
    startDate: Date,
    endDate: Date
  ) => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const responsibilityMap: { [key: string]: ResponsibilityData } = {};
    
    // 月全体の日付別データを一括取得
    for (const day of days) {
      const dateString = format(day, 'yyyy-MM-dd');
      
      try {
        const responsibilities = await fetchResponsibilities(dateString);
        
        // 取得したデータをスタッフ別にマッピング
        responsibilities.forEach((item: any) => {
          if (item.staffId && item.responsibilities) {
            const key = createResponsibilityKey(item.staffId, day);
            responsibilityMap[key] = item.responsibilities;
          }
        });
      } catch (error) {
        console.error(`担当設定データ取得エラー (${dateString}):`, error);
      }
    }
    
    setResponsibilityData(prev => ({ ...prev, ...responsibilityMap }));
    return responsibilityMap;
  }, [fetchResponsibilities]);

  return {
    responsibilityData,
    saveResponsibility,
    loadMonthResponsibilities,
    loadSingleDateResponsibilities,
    loadAllStaffMonthResponsibilities,
    getResponsibilityForDate,
    clearResponsibilityData,
    fetchResponsibilities
  };
};