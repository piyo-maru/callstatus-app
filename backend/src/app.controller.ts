import { Controller, Get } from '@nestjs/common';
// import { Public } from './auth/decorators/public.decorator'; // 一時的に無効化

@Controller()
export class AppController {
  /**
   * API接続テスト用エンドポイント（認証不要）
   */
  // @Public() // 一時的に無効化
  @Get('test')
  async test() {
    return {
      message: 'API server is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'ok'
    };
  }
}