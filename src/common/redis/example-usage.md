# Redis Cache Service Usage Examples

## 1. Basic Usage

```typescript
import { PrismaCacheService } from 'src/common/redis/prisma-cache.service';

@Injectable()
export class UserService {
  constructor(private readonly prismaCache: PrismaCacheService) {}

  // Find users with cache
  async findUsers(userId: string) {
    return this.prismaCache.findMany(
      'user',
      { where: { active: true }, take: 10 },
      userId,
      { ttl: 300 }, // 5 minutes
    );
  }

  // Find user by ID with cache
  async findUserById(id: string, userId: string) {
    return this.prismaCache.findUnique(
      'user',
      { where: { id } },
      userId,
      { ttl: 600 }, // 10 minutes
    );
  }

  // Count users with cache
  async countUsers(userId: string) {
    return this.prismaCache.count('user', { where: { active: true } }, userId, {
      ttl: 300,
    });
  }

  // Create user with cache invalidation
  async createUser(data: any) {
    return this.prismaCache.create(
      'user',
      { data },
      'user:*', // Invalidate all user cache
    );
  }

  // Update user with cache invalidation
  async updateUser(id: string, data: any) {
    return this.prismaCache.update(
      'user',
      { where: { id }, data },
      'user:*', // Invalidate all user cache
    );
  }
}
```

## 2. Advanced Usage with Custom Options

```typescript
// Custom serializer/deserializer
const customOptions = {
  ttl: 600, // 10 minutes
  prefix: 'myapp', // Custom prefix
  serialize: (data) => JSON.stringify(data, null, 2),
  deserialize: (data) => JSON.parse(data),
};

// Use with custom options
const users = await this.prismaCache.findMany(
  'user',
  { where: { role: 'admin' } },
  userId,
  customOptions,
);
```

## 3. Cache Statistics

```typescript
// Get cache statistics
const stats = this.prismaCache.getCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Total hits: ${stats.hits}`);
console.log(`Total misses: ${stats.misses}`);

// Get detailed cache info
const info = await this.prismaCache.getCacheInfo();
console.log(`Total keys: ${info.totalKeys}`);
console.log(`Redis info: ${info.redisInfo}`);
```

## 4. Cache Management

```typescript
// Invalidate specific model cache
await this.prismaCache.invalidateModel('user');

// Invalidate with pattern
await this.prismaCache.invalidateModel('user', 'user:admin:*');

// Invalidate all cache
await this.prismaCache.invalidateAll();

// Health check
const isHealthy = await this.prismaCache.healthCheck();
```

## 5. Direct Redis Cache Service Usage

```typescript
import { RedisCacheService } from 'src/common/redis/redis-cache.service';

@Injectable()
export class CustomService {
  constructor(private readonly cache: RedisCacheService) {}

  async getCustomData(key: string, userId: string) {
    return this.cache.getOrSet(
      'custom',
      'getData',
      { key },
      () => this.fetchDataFromAPI(key),
      userId,
      { ttl: 300 },
    );
  }

  async setCustomData(key: string, data: any, userId: string) {
    return this.cache.set('custom', 'setData', { key }, data, userId, {
      ttl: 600,
    });
  }
}
```

## 6. Module Setup

```typescript
// In your module
import { RedisCacheModule } from 'src/common/redis/redis-cache.module';

@Module({
  imports: [RedisCacheModule],
  providers: [YourService],
})
export class YourModule {}
```

## 7. Cache Key Patterns

The service automatically generates cache keys in this format:

```
cache:model:operation:userId:hashOfArgs
```

Examples:

- `cache:user:findMany:user123:abc123`
- `cache:job:findUnique:user456:def456`
- `cache:product:count:guest:ghi789`

## 8. Best Practices

1. **Use appropriate TTL**: Short for frequently changing data, long for stable data
2. **User-specific caching**: Always pass userId for user-specific data
3. **Invalidate on changes**: Always invalidate cache when data changes
4. **Monitor hit rate**: Aim for >80% hit rate for good performance
5. **Use patterns for invalidation**: Use wildcards to invalidate related cache
6. **Handle errors gracefully**: The service has built-in fallback to database
7. **Test cache behavior**: Always test cache hit/miss scenarios
