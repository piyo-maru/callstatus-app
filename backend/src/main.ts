import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as ini from 'ini';
import * as path from 'path';

// 設定ファイルを読み込む関数
function loadConfig() {
  const configPath = '/root/callstatus-app/config.ini';
  try {
    if (fs.existsSync(configPath)) {
      const configFile = fs.readFileSync(configPath, 'utf-8');
      const config = ini.parse(configFile);
      return config;
    }
  } catch (error) {
    console.warn('Config file not found or invalid, using defaults:', error.message);
  }
  
  // デフォルト設定
  return {
    cors: {
      allowed_origins: 'http://localhost:3000'
    }
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = loadConfig();

  // 大きなファイル処理用の設定
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));

  // グローバルエラーハンドラー
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // APIプレフィックス設定（認証テスト用）
  app.setGlobalPrefix('api');

  // CORS設定を動的に適用（元の仕様通り）
  const allowedOrigins = config.cors?.allowed_origins || 'http://localhost:3000,http://localhost:3001';
  const origins = allowedOrigins.split(',').map((origin: string) => origin.trim());
  
  console.log('CORS allowed origins:', origins);
  
  app.enableCors({
    origin: origins,
    credentials: true
  });
  
  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();