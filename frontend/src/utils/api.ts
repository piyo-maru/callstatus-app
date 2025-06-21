// 動的API URL取得ユーティリティ

declare global {
  interface Window {
    APP_CONFIG?: {
      API_HOST: string;
    };
  }
}

/**
 * 環境に応じて適切なAPI URLを取得
 * 1. window.APP_CONFIG.API_HOST（設定ファイル）
 * 2. localhost:3002（開発環境フォールバック）
 */
export const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.APP_CONFIG) {
    return window.APP_CONFIG.API_HOST;
  }
  // フォールバック（サーバーサイドレンダリング時など）
  return 'http://localhost:3002';
};

/**
 * API エンドポイントのフルURLを生成
 */
export const getApiEndpoint = (path: string): string => {
  const baseUrl = getApiUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};