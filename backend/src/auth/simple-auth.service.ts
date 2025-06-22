import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SimpleAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  /**
   * 簡易ユーザー存在確認（現在のスキーマ対応）
   */
  async getUserByEmail(email: string) {
    try {
      console.log('=== Simple Auth: getUserByEmail ===', { email });

      // 1. 既存の UserAuth をチェック
      const existingUserAuth = await this.prisma.userAuth.findUnique({
        where: { email },
        include: { staff: true }
      });

      if (existingUserAuth && existingUserAuth.isActive && !existingUserAuth.deletedAt) {
        console.log('Found existing UserAuth:', { email, userType: existingUserAuth.userType });
        return {
          exists: true,
          email: existingUserAuth.email,
          name: existingUserAuth.staff?.name || 'Administrator',
          hasPassword: !!existingUserAuth.password,
          userType: existingUserAuth.userType,
          isActive: existingUserAuth.isActive,
          staff: existingUserAuth.staff
        };
      }

      // 2. Contract から新規スタッフをチェック（実際のスキーマに合わせて修正）
      const contracts = await this.prisma.contract.findMany({
        where: { 
          email: email,
          staff: {
            isActive: true
          }
        },
        include: { staff: true },
        orderBy: { updatedAt: 'desc' } // 最新の契約を優先
      });

      const activeContract = contracts.length > 0 ? contracts[0] : null;

      if (activeContract?.staff) {
        console.log('Found active contract for new user:', { email, staffName: activeContract.staff.name });
        
        // 新規スタッフ - UserAuth を自動作成
        const newUserAuth = await this.prisma.userAuth.create({
          data: {
            email,
            userType: 'STAFF',
            staffId: activeContract.staff.id,
            isActive: true
          },
          include: { staff: true }
        });

        console.log('Created new UserAuth:', { email, id: newUserAuth.id });

        return {
          exists: true,
          email: newUserAuth.email,
          name: newUserAuth.staff.name,
          hasPassword: false,
          userType: 'STAFF',
          isActive: true,
          staff: newUserAuth.staff,
          autoCreated: true
        };
      }

      console.log('No user found for email:', { email });
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
   * ログイン認証
   */
  async login(email: string, password: string) {
    try {
      console.log('=== Simple Auth: login ===', { email });

      const userAuth = await this.prisma.userAuth.findUnique({
        where: { email },
        include: { staff: true }
      });

      if (!userAuth || !userAuth.isActive || userAuth.deletedAt) {
        throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
      }

      if (!userAuth.password || !password) {
        throw new UnauthorizedException('パスワードが設定されていません');
      }

      const isPasswordValid = await bcrypt.compare(password, userAuth.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
      }

      // ログイン成功処理
      await this.prisma.userAuth.update({
        where: { id: userAuth.id },
        data: { lastLoginAt: new Date() }
      });

      // JWT生成
      const payload = {
        sub: userAuth.id,
        email: userAuth.email,
        userType: userAuth.userType,
        staffId: userAuth.staffId,
        adminRole: userAuth.adminRole
      };
      const token = this.jwtService.sign(payload);

      console.log('Login successful:', { email, userType: userAuth.userType });

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
  async setPassword(email: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('パスワードと確認パスワードが一致しません');
    }

    if (password.length < 8) {
      throw new BadRequestException('パスワードは8文字以上で設定してください');
    }

    try {
      console.log('=== Simple Auth: setPassword ===', { email });

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

      console.log('Password set successful:', { email });

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
}