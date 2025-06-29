import { Controller, Post, Get, Body, Query, UseGuards, Request, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  health() {
    return { status: 'ok', message: 'Auth service is running' };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: any) {
    const { email, password } = body;
    return this.authService.login(email, password);
  }

  @Post('set-password')
  @HttpCode(200)
  async setPassword(@Body() body: any) {
    const { email, password, confirmPassword } = body;
    return this.authService.setPassword(email, password, confirmPassword);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async changePassword(@Request() req: any, @Body() body: any) {
    const { currentPassword, newPassword } = body;
    await this.authService.changePassword(req.user.sub, currentPassword, newPassword);
    return { message: 'パスワードが変更されました' };
  }

  @Get('user')
  async getUserInfo(@Query('email') email: string) {
    if (!email) {
      return { exists: false, hasPassword: false };
    }
    return this.authService.checkUserExists(email);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return req.user;
  }
}