import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
  
  const config = new DocumentBuilder()
    .setTitle('FoodEngine API')
    .setDescription(
      'Multi-Tenant Real-Time Food Delivery & Logistics Engine API documentation',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'jwt',
        description: 'Enter JWT Access Token',
        in: 'header',
      },
      'JWT-auth', // token reference key used by @ApiBearerAuth()
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha'
    },
    customSiteTitle: 'API Documentation',
    customCss: `
     .swagger-ui .topbar {display:none}
     .swagger-ui .info {margin:50px, 0}
     .swagger-ui .info .title {color: #4A90E2}
    `
  })



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
