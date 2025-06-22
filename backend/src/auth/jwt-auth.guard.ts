import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // パブリックエンドポイントはスキップ
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('認証トークンがありません');
    }

    const token = authHeader.substring(7);

    try {
      // JWTトークンを検証
      const payload = this.jwtService.verify(token, {
        secret: process.env.NEXTAUTH_SECRET || 'your-super-secret-key-here',
      });

      // ユーザー情報を取得
      const user = await this.prisma.userAuth.findUnique({
        where: { id: payload.sub },
        include: { staff: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('ユーザーが無効です');
      }

      // リクエストオブジェクトにユーザー情報を添付
      request.user = {
        id: user.id,
        email: user.email,
        role: user.userType,
        staffId: user.staffId,
        staff: user.staff,
      };

      return true;
    } catch (error) {
      console.error('JWT verification failed:', error);
      throw new UnauthorizedException('無効な認証トークンです');
    }
  }
}