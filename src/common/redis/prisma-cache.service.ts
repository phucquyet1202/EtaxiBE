/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisCacheService, CacheOptions } from './redis-cache.service';
import { Prisma } from '@prisma/client';
@Injectable()
export class PrismaCacheService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  public get client(): PrismaService {
    return this.prisma;
  }

  /**
   * Cached findMany operation
   */
  async findMany<T = any>(
    model: string,
    args: any,
    userId?: string,
    options?: CacheOptions,
  ): Promise<T[]> {
    return this.cache.getOrSet(
      model,
      'findMany',
      args,
      () => this.prisma[model].findMany(args),
      userId,
      options,
    );
  }

  /**
   * Cached findFirst operation
   */
  async findFirst<T = any>(
    model: string,
    args: any,
    userId?: string,
    options?: CacheOptions,
  ): Promise<T | null> {
    return this.cache.getOrSet(
      model,
      'findFirst',
      args,
      () => this.prisma[model].findFirst(args),
      userId,
      options,
    );
  }

  /**
   * Cached findUnique operation
   */
  async findUnique<T = any>(
    model: string,
    args: any,
    userId?: string,
    options?: CacheOptions,
  ): Promise<T | null> {
    return this.cache.getOrSet(
      model,
      'findUnique',
      args,
      () => this.prisma[model].findUnique(args),
      userId,
      options,
    );
  }

  /**
   * Cached count operation
   */
  async count(
    model: string,
    args: any,
    userId?: string,
    options?: CacheOptions,
  ): Promise<number> {
    return this.cache.getOrSet(
      model,
      'count',
      args,
      () => this.prisma[model].count(args),
      userId,
      options,
    );
  }

  /**
   * Cached aggregate operation
   */
  async aggregate<T = any>(
    model: string,
    args: any,
    userId?: string,
    options?: CacheOptions,
  ): Promise<T> {
    return this.cache.getOrSet(
      model,
      'aggregate',
      args,
      () => this.prisma[model].aggregate(args),
      userId,
      options,
    );
  }

  /**
   * Cached groupBy operation
   */
  async groupBy<T = any>(
    model: string,
    args: any,
    userId?: string,
    options?: CacheOptions,
  ): Promise<T> {
    return this.cache.getOrSet(
      model,
      'groupBy',
      args,
      () => this.prisma[model].groupBy(args),
      userId,
      options,
    );
  }

  /**
   * Create operation with cache invalidation
   */
  async create<T = any>(
    model: string,
    args: any,
    invalidatePattern?: string,
  ): Promise<T> {
    const result = await this.prisma[model].create(args);

    // Invalidate cache
    await this.cache.invalidate(model, invalidatePattern);

    return result;
  }

  /**
   * Update operation with cache invalidation
   */
  async update<T = any>(
    model: string,
    args: any,
    invalidatePattern?: string,
  ): Promise<T> {
    const result = await this.prisma[model].update(args);

    // Invalidate cache
    await this.cache.invalidate(model, invalidatePattern);

    return result;
  }

  /**
   * UpdateMany operation with cache invalidation
   */
  async updateMany<T = any>(
    model: string,
    args: any,
    invalidatePattern?: string,
  ): Promise<T> {
    const result = await this.prisma[model].updateMany(args);

    // Invalidate cache
    await this.cache.invalidate(model, invalidatePattern);

    return result;
  }

  /**
   * Delete operation with cache invalidation
   */
  async delete<T = any>(
    model: string,
    args: any,
    invalidatePattern?: string,
  ): Promise<T> {
    const result = await this.prisma[model].delete(args);

    // Invalidate cache
    await this.cache.invalidate(model, invalidatePattern);

    return result;
  }

  /**
   * DeleteMany operation with cache invalidation
   */
  async deleteMany<T = any>(
    model: string,
    args: any,
    invalidatePattern?: string,
  ): Promise<T> {
    const result = await this.prisma[model].deleteMany(args);

    // Invalidate cache
    await this.cache.invalidate(model, invalidatePattern);

    return result;
  }

  /**
   * Upsert operation with cache invalidation
   */
  async upsert<T = any>(
    model: string,
    args: any,
    invalidatePattern?: string,
  ): Promise<T> {
    const result = await this.prisma[model].upsert(args);

    // Invalidate cache
    await this.cache.invalidate(model, invalidatePattern);

    return result;
  }

  /**
   * CreateMany operation with cache invalidation
   */
  async createMany<T = any>(
    model: string,
    args: any,
    invalidatePattern?: string,
  ): Promise<T> {
    const result = await this.prisma[model].createMany(args);

    // Invalidate cache
    await this.cache.invalidate(model, invalidatePattern);

    return result;
  }

  async transaction<T>(promises: Prisma.PrismaPromise<T>[]): Promise<T[]> {
    // Gọi trực tiếp $transaction từ PrismaService được inject vào
    return this.prisma.$transaction(promises);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get cache info
   */
  getCacheInfo() {
    return this.cache.getInfo();
  }

  /**
   * Invalidate cache for specific model
   */
  async invalidateModel(model: string, pattern?: string) {
    return this.cache.invalidate(model, pattern);
  }

  /**
   * Invalidate all cache
   */
  async invalidateAll() {
    return this.cache.invalidateAll();
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.cache.healthCheck();
  }
}
