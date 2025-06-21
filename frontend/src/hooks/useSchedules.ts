import { useState, useEffect } from 'react';
import { Schedule } from '@/types';
import { getApiEndpoint } from '@/utils/api';

export const useSchedules = (selectedDate: string) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(getApiEndpoint(`/api/schedules?date=${date}`));
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules(selectedDate);
  }, [selectedDate]);

  return {
    schedules,
    loading,
    error,
    refetch: () => fetchSchedules(selectedDate)
  };
};