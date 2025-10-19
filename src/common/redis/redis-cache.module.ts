import { Global, Module } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';
import { PrismaCacheService } from './prisma-cache.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [RedisCacheService, PrismaCacheService],
  exports: [RedisCacheService, PrismaCacheService],
})
export class RedisCacheModule {}
