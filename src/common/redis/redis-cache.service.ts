/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  serialize?: (data: any) => string; // Custom serializer
  deserialize?: (data: string) => any; // Custom deserializer
  extraKey?: string; // Custom extra key (ưu tiên khi sinh key)
  enabled?: boolean; // Enable cache
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
  };

  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate cache key with consistent format
   */
  private generateKey(
    model: string,
    operation: string,
    args: any,
    userId?: string,
    prefix?: string,
    extraKey?: string,
  ): string {
    const keyParts = [
      prefix || 'cache',
      model.toLowerCase(),
      operation,
      userId || 'guest',
    ];

    // Nếu có extraKey thì ưu tiên dùng
    if (extraKey) {
      keyParts.push(this.hashObject(extraKey));
    } else {
      // fallback: hash từ args
      const relevantArgs = this.extractRelevantArgs(args);
      if (Object.keys(relevantArgs).length > 0) {
        keyParts.push(this.hashObject(relevantArgs));
      }
    }

    return keyParts.join(':');
  }

  /**
   * Extract only relevant args for cache key generation
   */
  private extractRelevantArgs(args: any): any {
    if (!args || typeof args !== 'object') return {};

    const relevant: any = {};

    if (args.where) relevant.where = args.where;
    if (args.skip !== undefined) relevant.skip = args.skip;
    if (args.take !== undefined) relevant.take = args.take;
    if (args.cursor) relevant.cursor = args.cursor;
    if (args.orderBy) relevant.orderBy = args.orderBy;
    if (args.select) relevant.select = args.select;
    if (args.include) relevant.include = args.include;
    if (args.distinct) relevant.distinct = args.distinct;

    return relevant;
  }

  /**
   * Create a hash of object for consistent key generation
   */
  private hashObject(obj: any): string {
    const str =
      typeof obj === 'string'
        ? obj
        : JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get data from cache
   */
  async get<T = any>(
    model: string,
    operation: string,
    args: any,
    userId?: string,
    options?: CacheOptions,
  ): Promise<T | null> {
    const key = this.generateKey(
      model,
      operation,
      args,
      userId,
      options?.prefix,
      options?.extraKey,
    );

    try {
      const cached = await this.redis.get(key);
      if (cached) {
        this.stats.hits++;
        this.updateHitRate();
        this.logger.debug(`[Cache HIT] ${key}`);

        const deserializer = options?.deserialize || JSON.parse;
        return deserializer(cached);
      }

      this.stats.misses++;
      this.updateHitRate();
      this.logger.debug(`[Cache MISS] ${key}`);
      return null;
    } catch (error: any) {
      this.stats.errors++;
      this.logger.warn(`[Cache GET Error] ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set data to cache
   */
  async set<T = any>(
    model: string,
    operation: string,
    args: any,
    data: T,
    userId?: string,
    options?: CacheOptions,
  ): Promise<boolean> {
    const key = this.generateKey(
      model,
      operation,
      args,
      userId,
      options?.prefix,
      options?.extraKey,
    );

    try {
      const ttl = options?.ttl || 300;
      const serializer = options?.serialize || JSON.stringify;
      const serializedData = serializer(data);

      await this.redis.setex(key, ttl, serializedData);
      this.stats.sets++;
      this.logger.debug(`[Cache SET] ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error: any) {
      this.stats.errors++;
      this.logger.warn(`[Cache SET Error] ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get or set pattern - get from cache or execute query and cache result
   */
  async getOrSet<T = any>(
    model: string,
    operation: string,
    args: any,
    queryFn: () => Promise<T>,
    userId?: string,
    options?: CacheOptions,
  ): Promise<T> {
    if (!options?.enabled) {
      return await queryFn();
    }
    const cached = await this.get<T>(model, operation, args, userId, options);
    if (cached !== null) {
      return cached;
    }

    const result = await queryFn();
    await this.set(model, operation, args, result, userId, options);

    return result;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(
    model: string,
    pattern?: string,
    userId?: string,
  ): Promise<number> {
    try {
      // Nếu có truyền pattern thì dùng, không thì clear theo model
      const searchPattern = pattern || `cache:${model}:*`;
      const keys = await this.redis.keys(searchPattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.deletes += keys.length;
        this.logger.log(
          `[Cache INVALIDATE] ${keys.length} keys for pattern: ${searchPattern}`,
        );
      }

      return keys.length;
    } catch (error: any) {
      this.stats.errors++;
      this.logger.warn(`[Cache INVALIDATE Error] ${error.message}`);
      return 0;
    }
  }

  /**
   * Invalidate all cache
   */
  async invalidateAll(): Promise<number> {
    try {
      const keys = await this.redis.keys('cache:*');

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.deletes += keys.length;
        this.logger.log(`[Cache INVALIDATE ALL] ${keys.length} keys`);
      }

      return keys.length;
    } catch (error: any) {
      this.stats.errors++;
      this.logger.warn(`[Cache INVALIDATE ALL Error] ${error.message}`);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error(`[Cache Health Check Failed] ${error.message}`);
      return false;
    }
  }

  /**
   * Get cache info
   */
  async getInfo(): Promise<any> {
    try {
      const info = await this.redis.info();
      const keys = await this.redis.keys('cache:*');

      return {
        stats: this.getStats(),
        totalKeys: keys.length,
        redisInfo: info,
      };
    } catch (error: any) {
      this.logger.error(`[Cache Info Error] ${error.message}`);
      return null;
    }
  }
}
