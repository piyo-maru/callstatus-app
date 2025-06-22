import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SimpleAuthService } from './simple-auth.service';
import { RateLimitService } from './rate-limit.service';
import { SessionService } from './session.service';
// import { UnifiedAuthService } from './unified-auth.service'; // 一時的にコメントアウト
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.NEXTAUTH_SECRET || 'your-super-secret-key-here',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    SimpleAuthService, 
    RateLimitService,
    SessionService,
    JwtAuthGuard, 
    RolesGuard, 
    PrismaService
  ],
  exports: [
    AuthService, 
    SimpleAuthService, 
    RateLimitService,
    SessionService,
    JwtAuthGuard, 
    RolesGuard, 
    JwtModule
  ],
})
export class AuthModule {}