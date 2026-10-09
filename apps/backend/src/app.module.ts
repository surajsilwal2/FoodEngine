import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@foodengine/database';
import { RestaurantModule } from './restaurant/restaurant.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { MenuModule } from './menu/menu.module.js';
import { DriverModule } from './driver/driver.module.js';
import { OrderModule } from './order/order.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { RedisModule } from './redis/redis.module.js';
import { getRedisOptions } from './redis/redis.config.js';
import { DispatchModule } from './dispatch/dispatch.module.js';
import { DeliveryModule } from './delivery/delivery.module.js';
import { resolve } from 'node:path';
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath is an array of paths to .env files. The first path is the .env file in the current working directory, and the second path is the .env file in the parent directory. This allows for environment variables to be loaded from multiple locations.
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
      ],
    }),
    BullModule.forRoot({
      // Same options as the application's Redis client: BullMQ workers run
      // blocking commands, so they need unlimited retries and the identical
      // TLS/credential settings.
      connection: getRedisOptions(),
    }),
    DatabaseModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    RestaurantModule,
    AuthModule,
    TenantModule,
    MenuModule,
    DriverModule,
    OrderModule,
    PaymentsModule,
    RedisModule,
    DispatchModule,
    DeliveryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
