import { Controller, Post, Get, Body, Query, BadRequestException } from '@nestjs/common';
import { AuthService, LoginDto, SetPasswordDto, ChangePasswordDto } from './auth.service';
import { SimpleAuthService } from './simple-auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly simpleAuthService: SimpleAuthService
  ) {}

  /**
   * ユーザーログイン
   */
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    console.log('=== Login attempt ===', { email: loginDto.email });
    
    try {
      const result = await this.authService.login(loginDto);
      console.log('Login successful:', { email: loginDto.email, userType: result.user.userType });
      return result;
    } catch (error) {
      console.error('Login failed:', { email: loginDto.email, error: error.message });
      throw error;
    }
  }

  /**
   * 初回パスワード設定
   */
  @Public()
  @Post('set-password')
  async setPassword(@Body() setPasswordDto: SetPasswordDto) {
    console.log('=== Set password attempt ===', { email: setPasswordDto.email });
    
    try {
      const result = await this.authService.setPassword(setPasswordDto);
      console.log('Password set successful:', { email: setPasswordDto.email });
      return result;
    } catch (error) {
      console.error('Set password failed:', { email: setPasswordDto.email, error: error.message });
      throw error;
    }
  }

  /**
   * パスワード変更
   */
  @Post('change-password')
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    console.log('=== Change password attempt ===', { email: changePasswordDto.email });
    
    try {
      const result = await this.authService.changePassword(changePasswordDto);
      console.log('Password change successful:', { email: changePasswordDto.email });
      return result;
    } catch (error) {
      console.error('Change password failed:', { email: changePasswordDto.email, error: error.message });
      throw error;
    }
  }

  /**
   * ユーザー情報取得（簡易認証システム使用）
   */
  @Public()
  @Get('user')
  async getUserInfo(@Query('email') email: string) {
    console.log('=== Get user info (simple) ===', { email });
    
    if (!email) {
      throw new BadRequestException('メールアドレスが必要です');
    }
    
    try {
      const result = await this.simpleAuthService.getUserByEmail(email);
      console.log('Get user info successful:', { email, hasPassword: result.hasPassword, userType: result.userType });
      return result;
    } catch (error) {
      console.error('Get user info failed:', { email, error: error.message });
      throw error;
    }
  }

  /**
   * ログイン（簡易認証システム使用）
   */
  @Public()
  @Post('login-simple')
  async loginSimple(@Body() loginDto: LoginDto) {
    console.log('=== Login attempt (simple) ===', { email: loginDto.email });
    
    try {
      const result = await this.simpleAuthService.login(loginDto.email, loginDto.password);
      console.log('Login successful (simple):', { email: loginDto.email });
      return result;
    } catch (error) {
      console.error('Login failed (simple):', { email: loginDto.email, error: error.message });
      throw error;
    }
  }

  /**
   * パスワード設定（簡易認証システム使用）
   */
  @Public()
  @Post('set-password-simple')
  async setPasswordSimple(@Body() setPasswordDto: SetPasswordDto) {
    console.log('=== Set password attempt (simple) ===', { email: setPasswordDto.email });
    
    try {
      const result = await this.simpleAuthService.setPassword(
        setPasswordDto.email, 
        setPasswordDto.password, 
        setPasswordDto.confirmPassword
      );
      console.log('Set password successful (simple):', { email: setPasswordDto.email });
      return result;
    } catch (error) {
      console.error('Set password failed (simple):', { email: setPasswordDto.email, error: error.message });
      throw error;
    }
  }

  /**
   * テスト用エンドポイント（認証システム動作確認用）
   */
  @Public()
  @Get('test')
  async test() {
    return { 
      message: '認証システム動作中',
      timestamp: new Date().toISOString(),
      endpoints: [
        'POST /api/auth/login',
        'POST /api/auth/set-password', 
        'POST /api/auth/change-password',
        'GET /api/auth/user-info',
        'GET /api/auth/test'
      ]
    };
  }
}