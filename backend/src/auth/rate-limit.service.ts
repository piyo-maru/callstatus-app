import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LoginAttemptInfo {
  isBlocked: boolean;
  remainingAttempts: number;
  lockoutUntil?: Date;
  nextAttemptAllowed?: Date;
}

@Injectable()
export class RateLimitService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly MAX_LOGIN_ATTEMPTS = 5; // 最大ログイン試行回数
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15分間のロックアウト
  private readonly ATTEMPT_WINDOW = 60 * 60 * 1000; // 1時間の試行ウィンドウ
  private readonly PROGRESSIVE_DELAY = [0, 1000, 2000, 5000, 10000]; // 段階的遅延（ミリ秒）

  /**
   * ログイン試行前のチェック
   */
  async checkLoginAttempt(email: string, ipAddress?: string): Promise<LoginAttemptInfo> {
    const user = await this.prisma.userAuth.findUnique({
      where: { email },
      select: { id: true, loginAttempts: true, lockedAt: true },
    });

    if (!user) {
      // ユーザーが存在しない場合は IP ベースの制限のみ適用
      return this.checkIpRateLimit(ipAddress);
    }

    // アカウントロック状態チェック
    if (user.lockedAt && new Date() < new Date(user.lockedAt.getTime() + this.LOCKOUT_DURATION)) {
      const lockoutUntil = new Date(user.lockedAt.getTime() + this.LOCKOUT_DURATION);
      return {
        isBlocked: true,
        remainingAttempts: 0,
        lockoutUntil,
        nextAttemptAllowed: lockoutUntil,
      };
    }

    // ロックアウト期間が過ぎている場合はリセット
    if (user.lockedAt && new Date() >= new Date(user.lockedAt.getTime() + this.LOCKOUT_DURATION)) {
      await this.resetLoginAttempts(user.id);
      return {
        isBlocked: false,
        remainingAttempts: this.MAX_LOGIN_ATTEMPTS,
      };
    }

    const remainingAttempts = Math.max(0, this.MAX_LOGIN_ATTEMPTS - user.loginAttempts);
    
    // IP ベースの制限も確認
    const ipLimitInfo = await this.checkIpRateLimit(ipAddress);
    
    return {
      isBlocked: remainingAttempts === 0 || ipLimitInfo.isBlocked,
      remainingAttempts: Math.min(remainingAttempts, ipLimitInfo.remainingAttempts),
      nextAttemptAllowed: ipLimitInfo.nextAttemptAllowed,
    };
  }

  /**
   * ログイン失敗を記録
   */
  async recordLoginFailure(email: string, ipAddress?: string): Promise<void> {
    const user = await this.prisma.userAuth.findUnique({
      where: { email },
      select: { id: true, loginAttempts: true },
    });

    if (user) {
      const newAttempts = user.loginAttempts + 1;
      const shouldLock = newAttempts >= this.MAX_LOGIN_ATTEMPTS;

      await this.prisma.userAuth.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          lockedAt: shouldLock ? new Date() : undefined,
        },
      });
    }

    // IP ベースの制限も記録
    if (ipAddress) {
      await this.recordIpAttempt(ipAddress);
    }
  }

  /**
   * ログイン成功時のリセット
   */
  async recordLoginSuccess(email: string): Promise<void> {
    const user = await this.prisma.userAuth.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      await this.resetLoginAttempts(user.id);
    }
  }

  /**
   * 段階的遅延の取得
   */
  getProgressiveDelay(attemptCount: number): number {
    const index = Math.min(attemptCount, this.PROGRESSIVE_DELAY.length - 1);
    return this.PROGRESSIVE_DELAY[index];
  }

  /**
   * アカウントロック解除（管理者用）
   */
  async unlockAccount(email: string): Promise<boolean> {
    const user = await this.prisma.userAuth.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      await this.resetLoginAttempts(user.id);
      return true;
    }

    return false;
  }

  /**
   * IP ベースのレート制限チェック
   */
  private async checkIpRateLimit(ipAddress?: string): Promise<LoginAttemptInfo> {
    if (!ipAddress) {
      return {
        isBlocked: false,
        remainingAttempts: this.MAX_LOGIN_ATTEMPTS,
      };
    }

    const windowStart = new Date(Date.now() - this.ATTEMPT_WINDOW);
    
    // 過去1時間の試行回数を確認（模擬実装）
    // 実際の実装では Redis や専用テーブルを使用することが望ましい
    const recentAttempts = await this.getIpAttemptCount(ipAddress, windowStart);
    
    const remainingAttempts = Math.max(0, this.MAX_LOGIN_ATTEMPTS * 2 - recentAttempts); // IPは少し緩い制限
    
    return {
      isBlocked: remainingAttempts === 0,
      remainingAttempts,
      nextAttemptAllowed: remainingAttempts === 0 ? new Date(Date.now() + 60000) : undefined, // 1分後
    };
  }

  /**
   * ログイン試行回数をリセット
   */
  private async resetLoginAttempts(userAuthId: string): Promise<void> {
    await this.prisma.userAuth.update({
      where: { id: userAuthId },
      data: {
        loginAttempts: 0,
        lockedAt: null,
      },
    });
  }

  /**
   * IP の試行回数を記録（簡易実装）
   */
  private async recordIpAttempt(ipAddress: string): Promise<void> {
    // 実際の実装では Redis や専用テーブルを使用
    // ここでは AuthAuditLog を利用した簡易実装
    await this.prisma.authAuditLog.create({
      data: {
        userAuthId: null,
        action: 'LOGIN_ATTEMPT',
        email: 'IP_RATE_LIMIT',
        ipAddress,
        userAgent: null,
        success: false,
        failureReason: 'Rate limit tracking',
      },
    });
  }

  /**
   * IP の試行回数を取得（簡易実装）
   */
  private async getIpAttemptCount(ipAddress: string, since: Date): Promise<number> {
    const count = await this.prisma.authAuditLog.count({
      where: {
        ipAddress,
        action: 'LOGIN_ATTEMPT',
        timestamp: { gte: since },
      },
    });

    return count;
  }

  /**
   * 現在ロックされているアカウント一覧を取得（管理者用）
   */
  async getLockedAccounts(): Promise<Array<{
    email: string;
    lockedAt: Date;
    lockoutUntil: Date;
    loginAttempts: number;
  }>> {
    const lockedUsers = await this.prisma.userAuth.findMany({
      where: {
        lockedAt: { not: null },
      },
      select: {
        email: true,
        lockedAt: true,
        loginAttempts: true,
      },
    });

    return lockedUsers
      .filter(user => user.lockedAt && new Date() < new Date(user.lockedAt.getTime() + this.LOCKOUT_DURATION))
      .map(user => ({
        email: user.email,
        lockedAt: user.lockedAt!,
        lockoutUntil: new Date(user.lockedAt!.getTime() + this.LOCKOUT_DURATION),
        loginAttempts: user.loginAttempts,
      }));
  }
}