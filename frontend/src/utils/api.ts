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
 * 2. 統一されたgetApiUrl関数（環境対応フォールバック）
 */
export const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.APP_CONFIG) {
    return window.APP_CONFIG.API_HOST;
  }
  
  // 統一されたAPI URL取得ロジックを使用（環境に応じたポート選択）
  if (typeof window === 'undefined') {
    return 'http://localhost:3002';
  }
  
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3002';
  }
  
  if (hostname === '10.99.129.21') {
    return `http://${hostname}:3003`; // 外部アクセス用ポート
  }
  
  return `http://${hostname}:3002`;
};

/**
 * API エンドポイントのフルURLを生成
 */
export const getApiEndpoint = (path: string): string => {
  const baseUrl = getApiUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};