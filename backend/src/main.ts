import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as ini from 'ini';
import * as path from 'path';

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

  // ★★★ 下の行をコメントアウトして、グローバルプレフィックスを無効化します ★★★
  // app.setGlobalPrefix('api');

  // CORS設定を動的に適用
  const allowedOrigins = config.cors?.allowed_origins || 'http://localhost:3000';
  const origins = allowedOrigins.split(',').map((origin: string) => origin.trim());
  
  console.log('CORS allowed origins:', origins);
  
  app.enableCors({
    origin: origins,
    credentials: true
  });
  
  await app.listen(3001);
  console.log('Application is running on: http://localhost:3001');
}
bootstrap();