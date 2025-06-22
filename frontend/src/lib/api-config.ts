/**
 * API設定の統一管理
 */

// 開発環境でのAPIポート検出
const detectApiPort = async (): Promise<number> => {
  const candidatePorts = [3002, 3003, 3001]; // 優先順位順
  
  for (const port of candidatePorts) {
    try {
      const response = await fetch(`http://localhost:${port}/api/test`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000) // 1秒でタイムアウト
      });
      
      if (response.ok) {
        console.log(`✅ API detected on port ${port}`);
        return port;
      }
    } catch (error) {
      // ポートが応答しない場合は次を試す
      continue;
    }
  }
  
  // デフォルトポート
  console.warn('⚠️ No API port detected, using default 3002');
  return 3002;
};

// APIベースURLを取得
export const getApiBaseUrl = async (): Promise<string> => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3002'; // SSR時のデフォルト
  }
  
  const hostname = window.location.hostname;
  
  // 開発環境（localhost）
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const port = await detectApiPort();
    return `http://localhost:${port}`;
  }
  
  // 特定のホスト設定
  if (hostname === '10.99.129.21') {
    return `http://${hostname}:3003`; // 既知の設定
  }
  
  // その他のホスト（本番環境等）
  return `http://${hostname}:3002`;
};

// 同期版（初期化済みの場合）
let cachedApiUrl: string | null = null;

export const getApiBaseUrlSync = (): string => {
  if (cachedApiUrl) {
    return cachedApiUrl;
  }
  
  if (typeof window === 'undefined') {
    return 'http://localhost:3002';
  }
  
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3002'; // デフォルト
  }
  
  if (hostname === '10.99.129.21') {
    return `http://${hostname}:3003`;
  }
  
  return `http://${hostname}:3002`;
};

// 初期化時にAPIポートを検出してキャッシュ
export const initializeApiConfig = async (): Promise<void> => {
  try {
    cachedApiUrl = await getApiBaseUrl();
    console.log(`🚀 API initialized: ${cachedApiUrl}`);
  } catch (error) {
    console.error('❌ API initialization failed:', error);
    cachedApiUrl = getApiBaseUrlSync(); // フォールバック
  }
};