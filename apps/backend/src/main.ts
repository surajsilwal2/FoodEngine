import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  // this enables to parse the cookie
  app.use(cookieParser());

  // enable CORS (Cross-Origin Resource Sharing)
  app.enableCors({
    origin: true, // In production, set to exact frontend domain
    credentials: true, //  Allows browsers to send cookies cross-origin
  });

  app.setGlobalPrefix('api/v1'); // set global prefix for the route

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
