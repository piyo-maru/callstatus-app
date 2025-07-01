// グローバル表示設定のキャッシュ管理

// デバッグログ制御
const isCacheDebugEnabled = () => typeof window !== 'undefined' && 
  process.env.NODE_ENV === 'development' && 
  window.localStorage?.getItem('cache-debug') === 'true';

export interface GlobalDisplaySettingsCache {
  customStatusColors: Record<string, string>;
  customStatusDisplayNames: Record<string, string>;
  lastUpdated: number;
}

// グローバルキャッシュ変数
let globalSettingsCache: GlobalDisplaySettingsCache = {
  customStatusColors: {},
  customStatusDisplayNames: {},
  lastUpdated: 0,
};

/**
 * グローバル設定キャッシュを更新
 */
export const updateGlobalDisplaySettingsCache = (
  customStatusColors: Record<string, string>,
  customStatusDisplayNames: Record<string, string>
) => {
  globalSettingsCache = {
    customStatusColors: { ...customStatusColors },
    customStatusDisplayNames: { ...customStatusDisplayNames },
    lastUpdated: Date.now(),
  };
  
  if (isCacheDebugEnabled()) console.log('グローバル表示設定キャッシュを更新しました:', globalSettingsCache);
};

/**
 * カスタムステータス色を取得
 */
export const getCachedStatusColor = (status: string): string | null => {
  const color = globalSettingsCache.customStatusColors[status] || null;
  if (isCacheDebugEnabled()) console.log(`[Cache] Getting color for status "${status}":`, color);
  return color;
};

/**
 * カスタムステータス表示名を取得
 */
export const getCachedStatusDisplayName = (status: string): string | null => {
  const displayName = globalSettingsCache.customStatusDisplayNames[status] || null;
  if (isCacheDebugEnabled()) console.log(`[Cache] Getting display name for status "${status}":`, displayName);
  return displayName;
};

/**
 * キャッシュが有効かチェック（5分以内）
 */
export const isCacheValid = (): boolean => {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  return globalSettingsCache.lastUpdated > fiveMinutesAgo;
};

/**
 * キャッシュが空かチェック
 */
export const isCacheEmpty = (): boolean => {
  return Object.keys(globalSettingsCache.customStatusColors).length === 0 && 
         Object.keys(globalSettingsCache.customStatusDisplayNames).length === 0;
};

/**
 * キャッシュの初期化（LocalStorageからフォールバック）
 */
export const initializeCacheFromLocalStorage = (): void => {
  if (typeof window === 'undefined') return;

  try {
    const savedColors = localStorage.getItem('callstatus-statusColors');
    const savedDisplayNames = localStorage.getItem('callstatus-statusDisplayNames');

    const customStatusColors = savedColors ? JSON.parse(savedColors) : {};
    const customStatusDisplayNames = savedDisplayNames ? JSON.parse(savedDisplayNames) : {};

    updateGlobalDisplaySettingsCache(customStatusColors, customStatusDisplayNames);
    if (isCacheDebugEnabled()) console.log('ローカルストレージからグローバル設定キャッシュを初期化しました');
  } catch (error) {
    console.error('ローカルストレージからの設定読み込みに失敗:', error);
  }
};