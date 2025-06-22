import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

export interface SessionInfo {
  id: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 新しいセッションを作成
   */
  async createSession(
    userAuthId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<SessionInfo> {
    // 既存の期限切れセッションをクリーンアップ
    await this.cleanupExpiredSessions(userAuthId);

    // 同一ユーザーの並行セッション数制限（最大5セッション）
    await this.limitConcurrentSessions(userAuthId, 5);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24時間
    const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7日間

    // JWTトークン生成
    const payload = {
      sub: userAuthId,
      type: 'access',
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };
    const token = this.jwtService.sign(payload);

    // リフレッシュトークン生成
    const refreshToken = crypto.randomBytes(32).toString('hex');

    // セッションをデータベースに保存
    const session = await this.prisma.authSession.create({
      data: {
        userAuthId,
        token,
        refreshToken,
        expiresAt,
        refreshExpiresAt,
        userAgent: userAgent?.substring(0, 500), // 長すぎる場合は切り詰め
        ipAddress,
        isActive: true,
        lastActivityAt: now,
      },
    });

    return {
      id: session.id,
      token,
      refreshToken,
      expiresAt,
      userAgent,
      ipAddress,
      isActive: true,
    };
  }

  /**
   * セッションを検証
   */
  async validateSession(token: string): Promise<SessionInfo | null> {
    try {
      // JWTトークンを検証
      const payload = this.jwtService.verify(token);
      
      // データベースでセッションを確認
      const session = await this.prisma.authSession.findFirst({
        where: {
          token,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: {
          userAuth: {
            select: {
              id: true,
              isActive: true,
              deletedAt: true,
            },
          },
        },
      });

      if (!session || !session.userAuth?.isActive || session.userAuth?.deletedAt) {
        return null;
      }

      // 最終アクティビティ時刻を更新
      await this.updateLastActivity(session.id);

      return {
        id: session.id,
        token: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        isActive: session.isActive,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * リフレッシュトークンで新しいアクセストークンを生成
   */
  async refreshSession(refreshToken: string): Promise<SessionInfo | null> {
    const session = await this.prisma.authSession.findFirst({
      where: {
        refreshToken,
        isActive: true,
        refreshExpiresAt: { gt: new Date() },
      },
      include: {
        userAuth: {
          select: {
            id: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!session || !session.userAuth?.isActive || session.userAuth?.deletedAt) {
      return null;
    }

    // 新しいアクセストークンを生成
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24時間

    const payload = {
      sub: session.userAuthId,
      type: 'access',
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };
    const newToken = this.jwtService.sign(payload);

    // セッションを更新
    const updatedSession = await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        token: newToken,
        expiresAt,
        lastActivityAt: now,
      },
    });

    return {
      id: updatedSession.id,
      token: newToken,
      refreshToken: updatedSession.refreshToken,
      expiresAt,
      userAgent: updatedSession.userAgent,
      ipAddress: updatedSession.ipAddress,
      isActive: true,
    };
  }

  /**
   * セッションを無効化
   */
  async invalidateSession(token: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  /**
   * ユーザーの全セッションを無効化
   */
  async invalidateAllUserSessions(userAuthId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userAuthId },
      data: { isActive: false },
    });
  }

  /**
   * 期限切れセッションをクリーンアップ
   */
  async cleanupExpiredSessions(userAuthId?: string): Promise<void> {
    const where: any = {
      OR: [
        { expiresAt: { lt: new Date() } },
        { refreshExpiresAt: { lt: new Date() } },
      ],
    };

    if (userAuthId) {
      where.userAuthId = userAuthId;
    }

    await this.prisma.authSession.deleteMany({ where });
  }

  /**
   * 並行セッション数制限
   */
  private async limitConcurrentSessions(
    userAuthId: string,
    maxSessions: number,
  ): Promise<void> {
    const activeSessions = await this.prisma.authSession.findMany({
      where: {
        userAuthId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'asc' },
    });

    if (activeSessions.length >= maxSessions) {
      // 古いセッションから削除
      const sessionsToDelete = activeSessions.slice(0, activeSessions.length - maxSessions + 1);
      await this.prisma.authSession.updateMany({
        where: {
          id: { in: sessionsToDelete.map(s => s.id) },
        },
        data: { isActive: false },
      });
    }
  }

  /**
   * 最終アクティビティ時刻を更新
   */
  private async updateLastActivity(sessionId: string): Promise<void> {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  }

  /**
   * ユーザーのアクティブセッション一覧を取得
   */
  async getUserSessions(userAuthId: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.authSession.findMany({
      where: {
        userAuthId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions.map(session => ({
      id: session.id,
      token: session.token,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      isActive: session.isActive,
    }));
  }
}