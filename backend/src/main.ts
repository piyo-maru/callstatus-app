import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
  origin: '*', // ★★★ 全てのアクセスを許可する（デモ用） ★★★
});
  await app.listen(3001);
}
bootstrap();