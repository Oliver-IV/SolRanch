import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import "dotenv/config"


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: String(process.env.FRONTEND_URL) || "http://localhost:5173",
    credentials: true
  }) ;
  app.use(cookieParser()) ;
  await app.listen(3000);
}
bootstrap();
