import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
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
   * ユーザー存在確認（Contract-based認証対応）
   */
  async checkUserExists(email: string) {
    // 既存のuser_authテーブルをチェック
    const user = await this.prisma.user_auth.findUnique({
      where: { email },
      include: { Staff: true },
    });

    if (user) {
      // 既存ユーザーの場合は従来通りの応答
      return {
        exists: true,
        hasPassword: !!user.password,
        name: user.Staff?.name || user.email.split('@')[0],
      };
    }

    // user_authに存在しない場合、Contractテーブルをチェック
    const contract = await this.prisma.contract.findFirst({
      where: { email },
      include: { Staff: true },
    });

    if (!contract) {
      // Contractにも存在しない場合
      return { exists: false, hasPassword: false };
    }

    // Contractに存在する場合：初回登録対象ユーザー
    return {
      exists: true,
      hasPassword: false,
      name: contract.name,
      isNewUser: true, // 新規ユーザーフラグ
      staffId: contract.staffId,
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

  /**
   * 初回パスワード設定申請
   */
  async requestInitialSetup(email: string) {
    console.log('=== 初回パスワード設定申請 ===', { email });

    // Contractテーブルでメールアドレス確認
    const contract = await this.prisma.contract.findFirst({
      where: { email },
      include: { Staff: true },
    });

    if (!contract) {
      throw new BadRequestException('登録されていないメールアドレスです');
    }

    // 既存のuser_authアカウント確認
    const existingUser = await this.prisma.user_auth.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.password) {
        throw new BadRequestException('既にパスワードが設定されています。パスワードリセットをご利用ください。');
      }
      // パスワード未設定の場合は、トークン生成してメール送信
    } else {
      // user_authアカウント新規作成
      const userId = randomUUID();
      const newUserAuth = await this.prisma.user_auth.create({
        data: {
          id: userId,
          email,
          userType: 'STAFF',
          isActive: true,
          updatedAt: new Date(),
        },
      });
      
      // staffIdを後で設定
      await this.prisma.user_auth.update({
        where: { id: userId },
        data: { staffId: contract.staffId },
      });
      
      console.log('新規user_authアカウント作成:', newUserAuth.id);
    }

    // パスワード設定用トークン生成
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24時間有効

    // トークンをデータベースに保存
    await this.prisma.password_reset_tokens.create({
      data: {
        id: randomUUID(),
        userAuthId: existingUser?.id || (await this.prisma.user_auth.findUnique({ where: { email } }))!.id,
        token,
        expiresAt,
        tokenType: 'INITIAL_PASSWORD_SETUP',
      },
    });

    // メール送信
    const mailSent = await this.mailService.sendInitialSetupMail(
      email,
      contract.name,
      token
    );

    if (!mailSent) {
      console.log('メール送信失敗 - フォールバック対応');
      return {
        success: true,
        message: 'アカウント準備が完了しました。管理者にパスワード設定をご依頼ください。',
        debug: 'メール送信失敗のため、手動対応が必要です',
      };
    }

    console.log('✅ 初回パスワード設定申請完了:', email);
    return {
      success: true,
      message: 'パスワード設定用のメールを送信しました。メールをご確認ください。',
      debug: `トークン生成: ${token}`,
    };
  }

  /**
   * パスワードリセット申請
   */
  async requestPasswordReset(email: string) {
    console.log('=== パスワードリセット申請 ===', { email });

    // user_authアカウント確認
    const user = await this.prisma.user_auth.findUnique({
      where: { email },
      include: { Staff: true },
    });

    if (!user) {
      throw new BadRequestException('登録されていないメールアドレスです');
    }

    if (!user.password) {
      throw new BadRequestException('パスワードが設定されていません。初回パスワード設定をご利用ください。');
    }

    // パスワードリセット用トークン生成
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1時間有効

    // トークンをデータベースに保存
    await this.prisma.password_reset_tokens.create({
      data: {
        id: randomUUID(),
        userAuthId: user.id,
        token,
        expiresAt,
        tokenType: 'PASSWORD_RESET',
      },
    });

    // メール送信
    const mailSent = await this.mailService.sendPasswordResetMail(
      email,
      user.Staff?.name || user.email.split('@')[0],
      token
    );

    if (!mailSent) {
      console.log('メール送信失敗 - フォールバック対応');
      return {
        success: true,
        message: 'パスワードリセット申請を受け付けました。管理者にお問い合わせください。',
        debug: 'メール送信失敗のため、手動対応が必要です',
      };
    }

    console.log('✅ パスワードリセット申請完了:', email);
    return {
      success: true,
      message: 'パスワードリセット用のメールを送信しました。メールをご確認ください。',
      debug: `トークン生成: ${token}`,
    };
  }

  /**
   * トークンを使用したパスワードリセット
   */
  async resetPasswordWithToken(token: string, password: string, confirmPassword: string) {
    console.log('=== トークンによるパスワードリセット ===', { token: token.substring(0, 8) + '...' });

    if (password !== confirmPassword) {
      throw new BadRequestException('パスワードが一致しません');
    }

    if (password.length < 8) {
      throw new BadRequestException('パスワードは8文字以上で設定してください');
    }

    // トークン検証
    const resetToken = await this.prisma.password_reset_tokens.findUnique({
      where: { token },
      include: { user_auth: { include: { Staff: true } } },
    });

    if (!resetToken) {
      throw new BadRequestException('無効なトークンです');
    }

    if (resetToken.isUsed) {
      throw new BadRequestException('このトークンは既に使用済みです');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('トークンの有効期限が切れています');
    }

    // パスワードハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // パスワード設定
    const updatedUser = await this.prisma.user_auth.update({
      where: { id: resetToken.userAuthId },
      data: {
        password: hashedPassword,
        passwordSetAt: new Date(),
        loginAttempts: 0,
      },
      include: { Staff: true },
    });

    // トークンを使用済みにマーク
    await this.prisma.password_reset_tokens.update({
      where: { id: resetToken.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    console.log('✅ パスワードリセット完了:', updatedUser.email);

    // JWTトークン生成
    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      userType: updatedUser.userType,
      staffId: updatedUser.staffId,
    };

    const jwtToken = this.jwtService.sign(payload);

    return {
      token: jwtToken,
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
}