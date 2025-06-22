import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

// DTOs
interface LoginDto {
  email: string;
  password: string;
}

interface SetPasswordDto {
  email: string;
  password: string;
  confirmPassword: string;
}

interface ChangePasswordDto {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable()
export class UnifiedAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  /**
   * 統一ユーザー存在確認（Contract.email + UserAuth）
   */
  async getUserByEmail(email: string) {
    try {
      // 1. 既存の UserAuth をチェック
      const existingUserAuth = await this.prisma.userAuth.findUnique({
        where: { email },
        include: { staff: true }
      });

      if (existingUserAuth && existingUserAuth.isActive && !existingUserAuth.deletedAt) {
        // 管理者または削除されていないユーザー
        if (existingUserAuth.userType === 'ADMIN' || !this.isInGracePeriod(existingUserAuth.staff)) {
          return {
            email: existingUserAuth.email,
            name: existingUserAuth.staff?.name || 'Administrator',
            hasPassword: !!existingUserAuth.password,
            userType: existingUserAuth.userType,
            isActive: existingUserAuth.isActive,
            staff: existingUserAuth.staff
          };
        }
      }

      // 2. Contract から新規スタッフをチェック
      const contract = await this.prisma.contract.findFirst({
        where: { email },
        include: { 
          staff: {
            where: { isActive: true }
          }
        }
      });

      if (contract && contract.staff && contract.staff.isActive) {
        // 新規スタッフ - UserAuth を自動作成
        const newUserAuth = await this.prisma.userAuth.create({
          data: {
            email,
            userType: 'STAFF',
            staffId: contract.staff.id,
            isActive: true
          },
          include: { staff: true }
        });

        return {
          email: newUserAuth.email,
          name: newUserAuth.staff.name,
          hasPassword: false,
          userType: 'STAFF',
          isActive: true,
          staff: newUserAuth.staff,
          autoCreated: true
        };
      }

      // 3. 7日猶予期間内の削除済みスタッフをチェック
      const gracePeriodContract = await this.prisma.contract.findFirst({
        where: { email },
        include: {
          staff: {
            where: {
              OR: [
                { isActive: false },
                { deletedAt: { not: null } }
              ]
            }
          }
        }
      });

      if (gracePeriodContract && gracePeriodContract.staff && this.isInGracePeriod(gracePeriodContract.staff)) {
        // 猶予期間内の削除済みスタッフ
        const gracePeriodUserAuth = await this.prisma.userAuth.findUnique({
          where: { email },
          include: { staff: true }
        });

        if (gracePeriodUserAuth) {
          return {
            email: gracePeriodUserAuth.email,
            name: gracePeriodUserAuth.staff?.name || 'Unknown',
            hasPassword: !!gracePeriodUserAuth.password,
            userType: 'STAFF',
            isActive: true,
            gracePeriod: true,
            staff: gracePeriodUserAuth.staff
          };
        }
      }

      throw new BadRequestException('ユーザーが見つかりません');

    } catch (error) {
      console.error('Get user error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('ユーザー情報の取得に失敗しました');
    }
  }

  /**
   * 猶予期間チェック（削除から7日以内）
   */
  private isInGracePeriod(staff: any): boolean {
    if (!staff || (!staff.deletedAt && staff.isActive)) {
      return false;
    }

    const gracePeriodEnd = staff.authGracePeriod || new Date(staff.deletedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    return new Date() < gracePeriodEnd;
  }

  /**
   * ログイン認証
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    
    try {
      // 監査ログ記録
      await this.logAuthAction('LOGIN_ATTEMPT', email, null);

      // ユーザー検索
      const userAuth = await this.prisma.userAuth.findUnique({
        where: { email },
        include: { staff: true }
      });

      if (!userAuth || !userAuth.isActive || userAuth.deletedAt) {
        await this.logAuthAction('LOGIN_FAILURE', email, null, 'ユーザーが見つかりません');
        throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
      }

      // アカウントロック確認
      if (userAuth.lockedAt && userAuth.lockedAt > new Date()) {
        await this.logAuthAction('LOGIN_FAILURE', email, userAuth.id, 'アカウントがロックされています');
        throw new UnauthorizedException('アカウントがロックされています');
      }

      // パスワード確認
      if (!userAuth.password || !password) {
        await this.logAuthAction('LOGIN_FAILURE', email, userAuth.id, 'パスワードが設定されていません');
        throw new UnauthorizedException('パスワードが設定されていません');
      }

      const isPasswordValid = await bcrypt.compare(password, userAuth.password);
      if (!isPasswordValid) {
        // ログイン失敗回数を増加
        await this.incrementLoginAttempts(userAuth.id);
        await this.logAuthAction('LOGIN_FAILURE', email, userAuth.id, 'パスワードが正しくありません');
        throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
      }

      // 猶予期間チェック（スタッフの場合）
      if (userAuth.userType === 'STAFF' && userAuth.staff && !this.isInGracePeriod(userAuth.staff)) {
        if (!userAuth.staff.isActive || userAuth.staff.deletedAt) {
          await this.logAuthAction('LOGIN_FAILURE', email, userAuth.id, '猶予期間終了');
          throw new UnauthorizedException('アカウントが無効です');
        }
      }

      // ログイン成功処理
      await this.prisma.userAuth.update({
        where: { id: userAuth.id },
        data: {
          lastLoginAt: new Date(),
          loginAttempts: 0 // リセット
        }
      });

      await this.logAuthAction('LOGIN_SUCCESS', email, userAuth.id);

      // JWT生成
      const payload = {
        sub: userAuth.id,
        email: userAuth.email,
        userType: userAuth.userType,
        staffId: userAuth.staffId,
        adminRole: userAuth.adminRole
      };
      const token = this.jwtService.sign(payload);

      // パスワードを除いたユーザー情報とトークンを返す
      const { password: _, ...userWithoutPassword } = userAuth;
      return {
        token,
        user: userWithoutPassword
      };

    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException('ログインに失敗しました');
    }
  }

  /**
   * パスワード設定（初回）
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
      const userAuth = await this.prisma.userAuth.findUnique({
        where: { email },
        include: { staff: true }
      });

      if (!userAuth) {
        throw new BadRequestException('ユーザーが見つかりません');
      }

      if (userAuth.password) {
        throw new BadRequestException('パスワードは既に設定されています');
      }

      // パスワードハッシュ化
      const hashedPassword = await bcrypt.hash(password, 12);

      // パスワード設定
      const updatedUser = await this.prisma.userAuth.update({
        where: { id: userAuth.id },
        data: {
          password: hashedPassword,
          passwordSetAt: new Date(),
          lastLoginAt: new Date()
        },
        include: { staff: true }
      });

      await this.logAuthAction('PASSWORD_SET', email, userAuth.id);

      // 自動ログイン用のJWT生成
      const payload = {
        sub: updatedUser.id,
        email: updatedUser.email,
        userType: updatedUser.userType,
        staffId: updatedUser.staffId,
        adminRole: updatedUser.adminRole
      };
      const token = this.jwtService.sign(payload);

      const { password: _, ...userWithoutPassword } = updatedUser;
      return {
        token,
        user: userWithoutPassword
      };

    } catch (error) {
      console.error('Set password error:', error);
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
      const userAuth = await this.prisma.userAuth.findUnique({
        where: { email }
      });

      if (!userAuth || !userAuth.password) {
        throw new UnauthorizedException('ユーザーが見つかりません');
      }

      // 現在のパスワード検証
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userAuth.password);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('現在のパスワードが正しくありません');
      }

      // 新しいパスワードハッシュ化
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      await this.prisma.userAuth.update({
        where: { id: userAuth.id },
        data: {
          password: hashedNewPassword,
          passwordSetAt: new Date()
        }
      });

      await this.logAuthAction('PASSWORD_CHANGE', email, userAuth.id);

      return { message: 'パスワードが正常に変更されました' };

    } catch (error) {
      console.error('Change password error:', error);
      throw new BadRequestException('パスワード変更に失敗しました');
    }
  }

  /**
   * ログイン試行回数増加
   */
  private async incrementLoginAttempts(userAuthId: string) {
    const userAuth = await this.prisma.userAuth.findUnique({
      where: { id: userAuthId }
    });

    if (userAuth) {
      const newAttempts = userAuth.loginAttempts + 1;
      const updateData: any = { loginAttempts: newAttempts };

      // 5回失敗でアカウントロック（1時間）
      if (newAttempts >= 5) {
        updateData.lockedAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間後
        await this.logAuthAction('ACCOUNT_LOCKED', userAuth.email, userAuthId);
      }

      await this.prisma.userAuth.update({
        where: { id: userAuthId },
        data: updateData
      });
    }
  }

  /**
   * 認証アクション監査ログ
   */
  private async logAuthAction(
    action: string, 
    email: string, 
    userAuthId?: string, 
    failureReason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await this.prisma.authAuditLog.create({
        data: {
          action: action as any,
          email,
          userAuthId,
          success: !failureReason,
          failureReason,
          ipAddress,
          userAgent
        }
      });
    } catch (error) {
      console.error('Failed to log auth action:', error);
    }
  }
}