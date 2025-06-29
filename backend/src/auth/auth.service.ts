import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * ユーザーログイン
   */
  async login(email: string, password: string) {
    console.log('=== ログイン試行 ===', { email });
    
    // ユーザー検索
    const user = await this.prisma.user_auth.findUnique({
      where: { email },
      include: { Staff: true },
    });

    if (!user) {
      console.log('❌ ユーザーが見つかりません:', email);
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    if (!user.isActive) {
      console.log('❌ 非アクティブなユーザー:', email);
      throw new UnauthorizedException('アカウントが無効です');
    }

    if (!user.password) {
      console.log('❌ パスワード未設定:', email);
      throw new UnauthorizedException('パスワードが設定されていません');
    }

    // パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ パスワード不正:', email);
      
      // ログイン試行回数をインクリメント
      await this.prisma.user_auth.update({
        where: { id: user.id },
        data: { loginAttempts: user.loginAttempts + 1 },
      });
      
      throw new UnauthorizedException('パスワードが正しくありません');
    }

    console.log('✅ ログイン成功:', email);

    // ログイン成功時の処理
    await this.prisma.user_auth.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginAttempts: 0, // リセット
      },
    });

    // JWTトークン生成
    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      staffId: user.staffId,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        staffId: user.staffId,
        isActive: user.isActive,
        Staff: user.Staff,
      },
    };
  }

  /**
   * パスワード設定（初回設定）
   */
  async setPassword(email: string, password: string, confirmPassword: string) {
    console.log('=== パスワード設定 ===', { email });
    
    if (password !== confirmPassword) {
      throw new BadRequestException('パスワードが一致しません');
    }

    if (password.length < 8) {
      throw new BadRequestException('パスワードは8文字以上で設定してください');
    }

    const user = await this.prisma.user_auth.findUnique({
      where: { email },
      include: { Staff: true },
    });

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    if (user.password) {
      throw new BadRequestException('パスワードは既に設定されています');
    }

    // パスワードハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // パスワード設定
    const updatedUser = await this.prisma.user_auth.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordSetAt: new Date(),
        loginAttempts: 0,
      },
      include: { Staff: true },
    });

    console.log('✅ パスワード設定完了:', email);

    // JWTトークン生成
    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      staffId: user.staffId,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        userType: updatedUser.userType,
        staffId: updatedUser.staffId,
        isActive: updatedUser.isActive,
        Staff: updatedUser.Staff,
      },
    };
  }

  /**
   * パスワード変更
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user_auth.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    if (!user.password) {
      throw new BadRequestException('パスワードが設定されていません');
    }

    // 現在のパスワード検証
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('現在のパスワードが正しくありません');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('新しいパスワードは8文字以上で設定してください');
    }

    // 新しいパスワードハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user_auth.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordSetAt: new Date(),
      },
    });

    console.log('✅ パスワード変更完了:', user.email);
  }

  /**
   * ユーザー存在確認
   */
  async checkUserExists(email: string) {
    const user = await this.prisma.user_auth.findUnique({
      where: { email },
      include: { Staff: true },
    });

    if (!user) {
      return { exists: false, hasPassword: false };
    }

    return {
      exists: true,
      hasPassword: !!user.password,
      name: user.Staff?.name || user.email.split('@')[0],
    };
  }

  /**
   * JWTトークン検証
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user_auth.findUnique({
      where: { id: userId },
      include: { Staff: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      staffId: user.staffId,
      isActive: user.isActive,
      Staff: user.Staff,
    };
  }
}