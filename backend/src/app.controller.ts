import { Controller, Get, Post, Body, Query, HttpCode } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as bcrypt from 'bcrypt';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  /**
   * API接続テスト用エンドポイント（認証不要）
   */
  @Get('test')
  async test() {
    return {
      message: 'API server is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'ok'
    };
  }

  // 一時的にコメントアウト（AuthModuleテスト用）
  // /**
  //  * 認証ヘルスチェック
  //  */
  // @Get('auth/health')
  // authHealth() {
  //   return { status: 'ok', message: 'Auth service is running' };
  // }

  // /**
  //  * ユーザー存在確認
  //  */
  // @Get('auth/user')
  // async getUserInfo(@Query('email') email: string) {
  //   if (!email) {
  //     return { exists: false, hasPassword: false };
  //   }

  //   const user = await this.prisma.user_auth.findUnique({
  //     where: { email },
  //     include: { Staff: true },
  //   });

  //   if (!user) {
  //     return { exists: false, hasPassword: false };
  //   }

  //   return {
  //     exists: true,
  //     hasPassword: !!user.password,
  //     name: user.Staff?.name || user.email.split('@')[0],
  //   };
  // }

  // /**
  //  * ログイン
  //  */
  // @Post('auth/login')
  // @HttpCode(200)
  // async login(@Body() body: any) {
  //   const { email, password } = body;
  //   console.log('=== ログイン試行 ===', { email });
  //   
  //   // ユーザー検索
  //   const user = await this.prisma.user_auth.findUnique({
  //     where: { email },
  //     include: { Staff: true },
  //   });

  //   if (!user) {
  //     console.log('❌ ユーザーが見つかりません:', email);
  //     throw new Error('ユーザーが見つかりません');
  //   }

  //   if (!user.isActive) {
  //     console.log('❌ 非アクティブなユーザー:', email);
  //     throw new Error('アカウントが無効です');
  //   }

  //   if (!user.password) {
  //     console.log('❌ パスワード未設定:', email);
  //     throw new Error('パスワードが設定されていません');
  //   }

  //   // パスワード検証
  //   const isPasswordValid = await bcrypt.compare(password, user.password);
  //   if (!isPasswordValid) {
  //     console.log('❌ パスワード不正:', email);
  //     throw new Error('パスワードが正しくありません');
  //   }

  //   console.log('✅ ログイン成功:', email);

  //   // ログイン成功時の処理
  //   await this.prisma.user_auth.update({
  //     where: { id: user.id },
  //     data: {
  //       lastLoginAt: new Date(),
  //       loginAttempts: 0, // リセット
  //     },
  //   });

  //   // 簡単なトークン生成（実運用では JWT を使用）
  //   const token = `simple-token-${user.id}-${Date.now()}`;

  //   return {
  //     token,
  //     user: {
  //       id: user.id,
  //       email: user.email,
  //       userType: user.userType,
  //       staffId: user.staffId,
  //       isActive: user.isActive,
  //       Staff: user.Staff,
  //     },
  //   };
  // }
}