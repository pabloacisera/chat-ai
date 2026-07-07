const mockRedisClient: Record<string, any> = {
  on: () => mockRedisClient,
  get: () => Promise.resolve(null),
  set: () => Promise.resolve('OK'),
  setex: () => Promise.resolve('OK'),
  del: () => Promise.resolve(1),
  expire: () => Promise.resolve(1),
  keys: () => Promise.resolve([]),
  quit: () => Promise.resolve('OK'),
  disconnect: () => undefined,
  connect: () => Promise.resolve(undefined),
};

function Redis(url: string, options: Record<string, any>) {
  return mockRedisClient;
}

export default Redis;
