import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';

export interface LoginDto {
  email: string;
  password: string;
}

export interface SetPasswordDto {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordDto {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * ユーザーログイン認証
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    
    try {
      // ユーザー検索（Staff情報も含める）
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: { 
          staff: true 
        }
      });

      if (!user) {
        throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('このアカウントは無効になっています');
      }

      // パスワード未設定の場合
      if (!user.password) {
        throw new UnauthorizedException('パスワードが設定されていません。初回ログインを行ってください');
      }

      // パスワード検証
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
      }

      // 最終ログイン時刻を更新
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // ログイン成功ログ
      await this.createAuditLog(user.id, 'LOGIN', 'AUTH', null, null, null);

      // パスワードを除いたユーザー情報を返す
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;

    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException('ログインに失敗しました');
    }
  }

  /**
   * 初回パスワード設定
   */
  async setPassword(setPasswordDto: SetPasswordDto) {
    const { email, password, confirmPassword } = setPasswordDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('パスワードと確認パスワードが一致しません');
    }

    if (password.length < 8) {
      throw new BadRequestException('パスワードは8文字以上で設定してください');
    }

    try {
      // ユーザー検索
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: { staff: true }
      });

      if (!user) {
        throw new BadRequestException('ユーザーが見つかりません');
      }

      if (!user.isActive) {
        throw new BadRequestException('このアカウントは無効になっています');
      }

      if (user.password) {
        throw new BadRequestException('パスワードは既に設定されています');
      }

      // パスワードハッシュ化
      const hashedPassword = await bcrypt.hash(password, 12);

      // パスワード設定
      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword,
          emailVerified: new Date() // メール認証済みとする
        }
      });

      // パスワード設定ログ
      await this.createAuditLog(user.id, 'CREATE', 'AUTH', 'password', null, { action: 'password_set' });

      console.log(`Password set for user: ${email}`);
      return { message: 'パスワードが正常に設定されました' };

    } catch (error) {
      console.error('Set password error:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('パスワード設定に失敗しました');
    }
  }

  /**
   * パスワード変更
   */
  async changePassword(changePasswordDto: ChangePasswordDto) {
    const { email, currentPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('新しいパスワードと確認パスワードが一致しません');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('パスワードは8文字以上で設定してください');
    }

    try {
      // ユーザー検索
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user || !user.password) {
        throw new UnauthorizedException('ユーザーが見つかりません');
      }

      // 現在のパスワード検証
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('現在のパスワードが正しくありません');
      }

      // 新しいパスワードハッシュ化
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // パスワード更新
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword }
      });

      // パスワード変更ログ
      await this.createAuditLog(user.id, 'UPDATE', 'AUTH', 'password', null, { action: 'password_change' });

      console.log(`Password changed for user: ${email}`);
      return { message: 'パスワードが正常に変更されました' };

    } catch (error) {
      console.error('Change password error:', error);
      
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('パスワード変更に失敗しました');
    }
  }

  /**
   * メールアドレスでユーザー検索（パスワード設定状況確認用）
   */
  async getUserByEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: { staff: true }
      });

      if (!user) {
        throw new BadRequestException('ユーザーが見つかりません');
      }

      return {
        email: user.email,
        hasPassword: !!user.password,
        isActive: user.isActive,
        staff: user.staff
      };

    } catch (error) {
      console.error('Get user error:', error);
      throw new BadRequestException('ユーザー情報の取得に失敗しました');
    }
  }

  /**
   * 監査ログ作成
   */
  private async createAuditLog(
    userId: string, 
    action: string, 
    resource: string, 
    resourceId: string | null, 
    oldData: any, 
    newData: any
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          oldData: oldData ? JSON.stringify(oldData) : null,
          newData: newData ? JSON.stringify(newData) : null,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Audit log creation failed:', error);
      // 監査ログ失敗は処理を停止させない
    }
  }
}