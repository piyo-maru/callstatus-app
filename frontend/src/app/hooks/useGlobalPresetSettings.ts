// グローバルプリセット設定管理のカスタムフック（スマートキャッシュ対応）

import { useState, useEffect, useCallback } from 'react';
import { UnifiedPreset, PresetCategory, UserPresetSettings } from '../components/types/PresetTypes';
import { getApiBaseUrlSync } from '../../lib/api-config';

// デバッグログ制御（統一）
const isDebugEnabled = () => typeof window !== 'undefined' && 
  process.env.NODE_ENV === 'development' && 
  window.localStorage?.getItem('app-debug') === 'true';

// グローバル設定キャッシュの型定義
interface GlobalPresetCache {
  globalPresets: UnifiedPreset[];
  categories: PresetCategory[];
  pagePresetSettings: UserPresetSettings['pagePresetSettings'];
  version: string;
  lastSyncTime: number;
  lastModified: string;
}

// API レスポンスの型定義（バックエンドと同期）
interface GlobalPresetSettingsApiResponse {
  presets: UnifiedPreset[];
  categories: PresetCategory[];
  pagePresetSettings: {
    monthlyPlanner: {
      enabledPresetIds: string[];
      defaultPresetId?: string;
      presetDisplayOrder?: string[];
    };
    personalPage: {
      enabledPresetIds: string[];
      defaultPresetId?: string;
      presetDisplayOrder?: string[];
    };
  };
  version: string;
  lastModified: string;
}

// グローバルプリセット設定管理設定
const GLOBAL_PRESET_CONFIG = {
  cacheKey: 'globalPresetCache',
  syncInterval: 30000, // 30秒ごとにバージョンチェック
  enableDebugLogging: true,
  fallbackToLocal: true,
};

export const useGlobalPresetSettings = () => {
  const [globalSettings, setGlobalSettings] = useState<GlobalPresetSettingsApiResponse | null>(null);
  const [localCache, setLocalCache] = useState<GlobalPresetCache | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  const apiUrl = getApiBaseUrlSync();

  // ローカルキャッシュの読み込み
  const loadLocalCache = useCallback((): GlobalPresetCache | null => {
    try {
      const cached = localStorage.getItem(GLOBAL_PRESET_CONFIG.cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached) as GlobalPresetCache;
        if (isDebugEnabled()) {
          console.log('[GlobalPresetSettings] ローカルキャッシュを読み込み:', {
            version: parsedCache.version,
            presetCount: parsedCache.globalPresets.length,
            lastSyncTime: new Date(parsedCache.lastSyncTime).toLocaleString()
          });
        }
        return parsedCache;
      }
    } catch (error) {
      console.warn('[GlobalPresetSettings] ローカルキャッシュの読み込みに失敗:', error);
    }
    return null;
  }, []);

  // ローカルキャッシュの保存
  const saveLocalCache = useCallback((cache: GlobalPresetCache) => {
    try {
      localStorage.setItem(GLOBAL_PRESET_CONFIG.cacheKey, JSON.stringify(cache));
      setLocalCache(cache);
      if (isDebugEnabled()) {
        console.log('[GlobalPresetSettings] ローカルキャッシュを保存しました:', {
          version: cache.version,
          presetCount: cache.globalPresets.length
        });
      }
    } catch (error) {
      console.error('[GlobalPresetSettings] ローカルキャッシュの保存に失敗:', error);
    }
  }, []);

  // サーバーからバージョン情報のみ取得（軽量チェック）
  const getServerVersion = useCallback(async (): Promise<{ version: string; lastModified: string } | null> => {
    try {
      const response = await fetch(`${apiUrl}/api/admin/global-preset-settings/version`);
      if (!response.ok) {
        throw new Error(`Version check failed: ${response.status}`);
      }
      const versionInfo = await response.json();
      return versionInfo;
    } catch (error) {
      if (isDebugEnabled()) {
        console.warn('[GlobalPresetSettings] サーバーバージョンチェック失敗:', error);
      }
      return null;
    }
  }, [apiUrl]);

  // サーバーからフル設定を取得
  const fetchGlobalSettings = useCallback(async (): Promise<GlobalPresetSettingsApiResponse | null> => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiUrl}/api/admin/global-preset-settings`);
      if (!response.ok) {
        throw new Error(`Settings fetch failed: ${response.status}`);
      }
      const settings = await response.json() as GlobalPresetSettingsApiResponse;
      
      if (isDebugEnabled()) {
        console.log('[GlobalPresetSettings] サーバーからグローバル設定を取得:', {
          version: settings.version,
          presetCount: settings.presets.length,
          lastModified: settings.lastModified
        });
      }
      
      return settings;
    } catch (error) {
      console.error('[GlobalPresetSettings] グローバル設定の取得に失敗:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  // キャッシュ同期ロジック（スマートキャッシュの核心）
  const syncWithServer = useCallback(async (force: boolean = false): Promise<boolean> => {
    const now = Date.now();
    
    // 強制同期でない場合、同期間隔をチェック
    if (!force && (now - lastSyncTime) < GLOBAL_PRESET_CONFIG.syncInterval) {
      return false;
    }

    try {
      // 1. サーバーのバージョンをチェック
      const serverVersion = await getServerVersion();
      if (!serverVersion) {
        // ネットワークエラーの場合、キャッシュがあればそれを使用
        if (localCache && GLOBAL_PRESET_CONFIG.fallbackToLocal) {
          if (isDebugEnabled()) {
            console.log('[GlobalPresetSettings] サーバー接続失敗、キャッシュを使用');
          }
          setGlobalSettings({
            presets: localCache.globalPresets,
            categories: localCache.categories,
            pagePresetSettings: localCache.pagePresetSettings,
            version: localCache.version,
            lastModified: localCache.lastModified
          });
          return false;
        }
        return false;
      }

      setLastSyncTime(now);

      // 2. バージョン比較
      if (localCache && localCache.version === serverVersion.version && !force) {
        if (isDebugEnabled()) {
          console.log('[GlobalPresetSettings] バージョン一致、同期スキップ:', serverVersion.version);
        }
        return false;
      }

      // 3. バージョンが異なる、または強制同期の場合、フル設定を取得
      if (isDebugEnabled()) {
        console.log('[GlobalPresetSettings] バージョン更新を検出、フル同期開始:', {
          cached: localCache?.version || 'なし',
          server: serverVersion.version
        });
      }

      const newSettings = await fetchGlobalSettings();
      if (!newSettings) {
        return false;
      }

      // 4. 新しい設定を状態とキャッシュに保存
      setGlobalSettings(newSettings);
      
      const newCache: GlobalPresetCache = {
        globalPresets: newSettings.presets,
        categories: newSettings.categories,
        pagePresetSettings: newSettings.pagePresetSettings,
        version: newSettings.version,
        lastSyncTime: now,
        lastModified: newSettings.lastModified
      };
      
      saveLocalCache(newCache);
      
      if (isDebugEnabled()) {
        console.log('[GlobalPresetSettings] グローバル設定の同期完了:', {
          version: newSettings.version,
          presetCount: newSettings.presets.length
        });
      }
      
      return true;
    } catch (error) {
      console.error('[GlobalPresetSettings] 同期処理でエラー:', error);
      return false;
    }
  }, [lastSyncTime, localCache, getServerVersion, fetchGlobalSettings, saveLocalCache]);

  // 初期化処理
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    setIsLoading(true);
    
    try {
      // 1. ローカルキャッシュを読み込み
      const cache = loadLocalCache();
      if (cache) {
        setLocalCache(cache);
        // キャッシュがあれば即座に表示
        setGlobalSettings({
          presets: cache.globalPresets,
          categories: cache.categories,
          pagePresetSettings: cache.pagePresetSettings,
          version: cache.version,
          lastModified: cache.lastModified
        });
        
        if (isDebugEnabled()) {
          console.log('[GlobalPresetSettings] キャッシュから即座に読み込み完了');
        }
      }
      
      // 2. バックグラウンドでサーバー同期
      await syncWithServer(true); // 初回は強制同期
      
    } catch (error) {
      console.error('[GlobalPresetSettings] 初期化エラー:', error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // 定期的なバックグラウンド同期
  useEffect(() => {
    if (!isInitialized) return;

    const intervalId = setInterval(() => {
      syncWithServer(false);
    }, GLOBAL_PRESET_CONFIG.syncInterval);

    return () => clearInterval(intervalId);
  }, [isInitialized]);

  // 初期化の実行
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    // グローバル設定データ
    globalSettings,
    isLoading,
    isInitialized,
    
    // キャッシュ状態
    isCacheAvailable: !!localCache,
    lastSyncTime: new Date(lastSyncTime).toLocaleString(),
    
    // 操作関数
    refreshSettings: () => syncWithServer(true),
    clearCache: () => {
      localStorage.removeItem(GLOBAL_PRESET_CONFIG.cacheKey);
      setLocalCache(null);
      console.log('[GlobalPresetSettings] キャッシュをクリアしました');
    },
    
    // ユーティリティ
    isOutdated: () => {
      if (!localCache) return true;
      const cacheAge = Date.now() - localCache.lastSyncTime;
      return cacheAge > GLOBAL_PRESET_CONFIG.syncInterval * 2; // 1分以上古い
    }
  };
};