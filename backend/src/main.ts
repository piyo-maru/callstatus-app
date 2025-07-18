import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as fs from 'fs';
import * as ini from 'ini';
import * as express from 'express';

// 設定ファイルを読み込む関数
function loadConfig() {
  const configPath = '/app/config.ini';
  try {
    if (fs.existsSync(configPath)) {
      const configFile = fs.readFileSync(configPath, 'utf-8');
      const config = ini.parse(configFile);
      return config;
    }
  } catch (error) {
    console.warn(
      'Config file not found or invalid, using defaults:',
      error.message,
    );
  }

  // デフォルト設定
  return {
    cors: {
      allowed_origins: 'http://localhost:3000',
    },
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // WebSocketアダプター設定（Socket.IO用）
  app.useWebSocketAdapter(new IoAdapter(app));
  console.log('WebSocket adapter initialized');

  const config = loadConfig();

  // 大きなファイル処理用の設定
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
  const allowedOrigins =
    config.cors?.allowed_origins ||
    'http://localhost:3000,http://localhost:3001';
  const origins = allowedOrigins
    .split(',')
    .map((origin: string) => origin.trim());

  console.log('CORS allowed origins:', origins);

  app.enableCors({
    origin: (origin, callback) => {
      // 開発環境では全てのオリジンを許可（originがundefinedの場合も含む）
      console.log('CORS request from origin:', origin);
      if (
        !origin ||
        origins.includes(origin) ||
        origin.startsWith('http://10.99.129.21:')
      ) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
