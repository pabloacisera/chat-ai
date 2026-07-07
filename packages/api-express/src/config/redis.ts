import Redis, { RedisOptions } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisOptions: RedisOptions = {
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

const redisClient = new Redis(REDIS_URL, redisOptions);

redisClient.on('connect', () => {
  console.log('✅ Conectado a Redis');
});

redisClient.on('error', (err) => {
  console.error('❌ Error en Redis:', err.message);
});

export default redisClient;
