import { useState, useCallback } from 'react';
import { Schedule } from '@/types';
import { getApiEndpoint } from '@/utils/api';

export const useScheduleManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // スケジュール作成
  const createSchedule = useCallback(async (scheduleData: Partial<Schedule>): Promise<Schedule> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiEndpoint('/api/schedules'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'スケジュールの作成に失敗しました');
      }

      const newSchedule = await response.json();
      return newSchedule;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // スケジュール更新
  const updateSchedule = useCallback(async (scheduleData: Partial<Schedule>): Promise<Schedule> => {
    if (!scheduleData.id) {
      throw new Error('スケジュールIDが必要です');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiEndpoint(`/api/schedules/${scheduleData.id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'スケジュールの更新に失敗しました');
      }

      const updatedSchedule = await response.json();
      return updatedSchedule;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // スケジュール削除
  const deleteSchedule = useCallback(async (scheduleId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiEndpoint(`/api/schedules/${scheduleId}`), {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'スケジュールの削除に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // エラーリセット
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createSchedule,
    updateSchedule,
    deleteSchedule,
    isLoading,
    error,
    clearError
  };
};