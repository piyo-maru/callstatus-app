// グローバル表示設定管理のカスタムフック

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../components/constants/MainAppConstants';
import { updateGlobalDisplaySettingsCache, initializeCacheFromLocalStorage } from '../utils/globalDisplaySettingsCache';

export interface GlobalDisplaySettings {
  viewMode: 'normal' | 'compact';
  maskingEnabled: boolean;
  timeRange: 'standard' | 'extended';
  customStatusColors: Record<string, string>;
  customStatusDisplayNames: Record<string, string>;
}

interface UseGlobalDisplaySettingsReturn {
  settings: GlobalDisplaySettings;
  isLoading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

export const useGlobalDisplaySettings = (authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>): UseGlobalDisplaySettingsReturn => {
  const [settings, setSettings] = useState<GlobalDisplaySettings>({
    viewMode: 'normal',
    maskingEnabled: false,
    timeRange: 'standard',
    customStatusColors: {},
    customStatusDisplayNames: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettingsFromServer = useCallback(async (): Promise<GlobalDisplaySettings | null> => {
    try {
      const currentApiUrl = getApiUrl();
      const fetchFunction = authenticatedFetch || fetch;
      const response = await fetchFunction(`${currentApiUrl}/api/admin/global-display-settings`);
      
      if (response.ok) {
        const serverSettings = await response.json();
        return {
          viewMode: serverSettings.viewMode || 'normal',
          maskingEnabled: serverSettings.maskingEnabled || false,
          timeRange: serverSettings.timeRange || 'standard',
          customStatusColors: serverSettings.customStatusColors || {},
          customStatusDisplayNames: serverSettings.customStatusDisplayNames || {},
        };
      } else {
        console.warn('グローバル表示設定の取得に失敗:', response.status);
        return null;
      }
    } catch (error) {
      console.error('グローバル表示設定取得エラー:', error);
      return null;
    }
  }, [authenticatedFetch]);

  const loadSettingsFromLocalStorage = useCallback((): GlobalDisplaySettings => {
    const viewMode = (localStorage.getItem('callstatus-viewMode') as 'normal' | 'compact') || 'normal';
    const maskingEnabled = localStorage.getItem('callstatus-maskingEnabled') === 'true';
    const timeRange = (localStorage.getItem('callstatus-timeRange') as 'standard' | 'extended') || 'standard';
    
    let customStatusColors = {};
    let customStatusDisplayNames = {};
    
    try {
      const savedColors = localStorage.getItem('callstatus-statusColors');
      if (savedColors) {
        customStatusColors = JSON.parse(savedColors);
      }
    } catch (error) {
      console.error('Failed to parse saved status colors:', error);
    }
    
    try {
      const savedDisplayNames = localStorage.getItem('callstatus-statusDisplayNames');
      if (savedDisplayNames) {
        customStatusDisplayNames = JSON.parse(savedDisplayNames);
      }
    } catch (error) {
      console.error('Failed to parse saved status display names:', error);
    }

    return {
      viewMode,
      maskingEnabled,
      timeRange,
      customStatusColors,
      customStatusDisplayNames,
    };
  }, []);

  const refreshSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // まずサーバーから取得を試行
      const serverSettings = await loadSettingsFromServer();
      
      if (serverSettings) {
        setSettings(serverSettings);
        // キャッシュを更新
        updateGlobalDisplaySettingsCache(
          serverSettings.customStatusColors,
          serverSettings.customStatusDisplayNames
        );
        console.log('サーバーからグローバル表示設定を読み込みました');
      } else {
        // サーバーから取得できない場合はローカルストレージから取得
        const localSettings = loadSettingsFromLocalStorage();
        setSettings(localSettings);
        // キャッシュをローカル設定で更新
        updateGlobalDisplaySettingsCache(
          localSettings.customStatusColors,
          localSettings.customStatusDisplayNames
        );
        console.log('ローカルストレージからグローバル表示設定を読み込みました');
        setError('サーバーからの設定取得に失敗しました。ローカル設定を使用しています。');
      }
    } catch (error) {
      console.error('設定読み込みエラー:', error);
      const localSettings = loadSettingsFromLocalStorage();
      setSettings(localSettings);
      // キャッシュをローカル設定で更新
      updateGlobalDisplaySettingsCache(
        localSettings.customStatusColors,
        localSettings.customStatusDisplayNames
      );
      setError('設定の読み込みに失敗しました。ローカル設定を使用しています。');
    } finally {
      setIsLoading(false);
    }
  }, [loadSettingsFromServer, loadSettingsFromLocalStorage]);

  // 初期読み込み
  useEffect(() => {
    // まずローカルストレージからキャッシュを初期化
    initializeCacheFromLocalStorage();
    // その後サーバーから最新設定を取得
    refreshSettings();
  }, [refreshSettings]);

  return {
    settings,
    isLoading,
    error,
    refreshSettings,
  };
};