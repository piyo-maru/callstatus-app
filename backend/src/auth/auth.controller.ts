import { Controller, Post, Get, Body, Query, BadRequestException } from '@nestjs/common';
import { AuthService, LoginDto, SetPasswordDto, ChangePasswordDto } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * ユーザーログイン
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    console.log('=== Login attempt ===', { email: loginDto.email });
    
    try {
      const result = await this.authService.login(loginDto);
      console.log('Login successful:', { email: loginDto.email, role: result.role });
      return result;
    } catch (error) {
      console.error('Login failed:', { email: loginDto.email, error: error.message });
      throw error;
    }
  }

  /**
   * 初回パスワード設定
   */
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
   * ユーザー情報取得（パスワード設定状況確認用）
   */
  @Get('user')
  async getUserInfo(@Query('email') email: string) {
    console.log('=== Get user info ===', { email });
    
    if (!email) {
      throw new BadRequestException('メールアドレスが必要です');
    }
    
    try {
      const result = await this.authService.getUserByEmail(email);
      console.log('Get user info successful:', { email, hasPassword: result.hasPassword });
      return result;
    } catch (error) {
      console.error('Get user info failed:', { email, error: error.message });
      throw error;
    }
  }
}