// CallStatus App Configuration
// 自動的に現在のホストに基づいてAPIサーバーを決定

window.APP_CONFIG = {
  // 動的ローカル開発環境用API接続設定
  get API_HOST() {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3002';
    }
    if (hostname === '10.99.129.21') {
      return 'http://10.99.129.21:3002';
    }
    return `http://${hostname}:3002`;
  },
  
  // デバッグ用：現在の設定を確認
  get DEBUG_INFO() {
    return {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      api_host: this.API_HOST
    };
  }
};