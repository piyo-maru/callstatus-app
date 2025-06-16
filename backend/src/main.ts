import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ★★★ 下の行をコメントアウトして、グローバルプレフィックスを無効化します ★★★
  // app.setGlobalPrefix('api');

  app.enableCors();
  await app.listen(3002);
}
bootstrap();