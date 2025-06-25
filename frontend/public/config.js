// CallStatus App Configuration
// 自動的に現在のホストに基づいてAPIサーバーを決定

window.APP_CONFIG = {
  // プロキシ設定を使用した相対パスAPI接続（CORS回避）
  API_HOST: '',
  
  // デバッグ用：現在の設定を確認
  get DEBUG_INFO() {
    return {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      api_host: this.API_HOST
    };
  }
};