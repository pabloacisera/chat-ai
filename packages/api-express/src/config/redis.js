import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
});

redisClient.on('connect', () => {
  console.log('✅ Conectado a Redis');
});

redisClient.on('error', (err) => {
  console.error('❌ Error en Redis:', err.message);
});

export default redisClient;