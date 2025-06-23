// CallStatus App Configuration
// 自動的に現在のホストに基づいてAPIサーバーを決定

window.APP_CONFIG = {
  // 動的API URL判定
  API_HOST: (() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // 開発環境
      return 'http://localhost:3002';
    } else if (hostname === '10.99.129.21') {
      // 社内テスト環境
      return 'http://10.99.129.21:3003';
    } else {
      // その他の環境（本番環境など）
      // 現在のホストと同じドメインのポート3002を使用
      return `${protocol}//${hostname}:3002`;
    }
  })(),
  
  // デバッグ用：現在の設定を確認
  get DEBUG_INFO() {
    return {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      api_host: this.API_HOST
    };
  }
};