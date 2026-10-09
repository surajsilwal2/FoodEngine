import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getRedisOptions } from './redis.config.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  onModuleInit() {
    this.client = new Redis(getRedisOptions());

    this.client.on('connect', () => {
      console.log('Connected cleanly to Redis In-Memory Engine');
    });

    this.client.on('error', (err) => {
      console.error('Redis Connection Error:', err);
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }
}
