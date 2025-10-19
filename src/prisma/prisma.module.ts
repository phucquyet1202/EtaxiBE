/* eslint-disable @typescript-eslint/require-await */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: 'REDIS',
      useFactory: async () => {
        const client = new Redis({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
        });

        client.on('error', (err) => {
          console.error('❌ Redis Client Error:', err);
        });

        return client;
      },
    },
  ],
  exports: [PrismaService, 'REDIS'],
})
export class PrismaModule {}
