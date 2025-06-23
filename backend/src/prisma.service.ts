// backend/src/prisma.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxRetries = 5;
    const retryDelay = 2000; // 2秒

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`データベース接続試行 ${attempt}/${maxRetries}...`);
        await this.$connect();
        
        // データベースセッションタイムゾーンをUTCに強制設定
        await this.$executeRaw`SET timezone TO 'UTC'`;
        this.logger.log('データベース接続成功（タイムゾーン: UTC）');
        return;
      } catch (error) {
        this.logger.error(`データベース接続失敗 (試行 ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt === maxRetries) {
          this.logger.error('データベース接続の最大試行回数に達しました');
          throw error;
        }
        
        this.logger.log(`${retryDelay}ms後に再試行します...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
}