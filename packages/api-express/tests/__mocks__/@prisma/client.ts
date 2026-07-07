const makeModel = (): Record<string, jest.Mock> => ({
  findUnique: jest.fn().mockResolvedValue(null),
  findFirst: jest.fn().mockResolvedValue(null),
  findMany: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  count: jest.fn().mockResolvedValue(0),
  upsert: jest.fn().mockResolvedValue({}),
  updateMany: jest.fn().mockResolvedValue({ count: 0 }),
});

class PrismaClient {
  user: Record<string, jest.Mock>;
  session: Record<string, jest.Mock>;
  userConfig: Record<string, jest.Mock>;
  modelConfig: Record<string, jest.Mock>;
  conversation: Record<string, jest.Mock>;
  message: Record<string, jest.Mock>;

  constructor() {
    this.user = makeModel();
    this.session = makeModel();
    this.userConfig = makeModel();
    this.modelConfig = makeModel();
    this.conversation = makeModel();
    this.message = makeModel();
  }
}

export { PrismaClient };
