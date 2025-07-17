// CallStatus App Configuration
// 自動的に現在のホストに基づいてAPIサーバーを決定

window.APP_CONFIG = {
  // 本番環境（EC2）用API接続設定
  API_HOST: 'http://18.179.58.147:3002',
  
  // デバッグ用：現在の設定を確認
  get DEBUG_INFO() {
    return {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      api_host: this.API_HOST
    };
  }
};