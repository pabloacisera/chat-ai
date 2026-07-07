import prisma from '../src/config/db.js';
import * as usersService from '../src/services/users.service.js';

jest.mock('../src/services/encryption.service.js', () => ({
  encrypt: (text: string) => `encrypted:${text}`,
  decrypt: (text: string) => text?.replace('encrypted:', '') || null,
}));

const mockConfig = {
  id: 'config-1',
  userId: 'user-1',
  theme: 'dark',
  activeModelId: 'gemini-2.5-flash',
  language: 'es',
  streamSpeed: 5,
  showTitle: false,
  autoDeleteDays: 30,
  updatedAt: new Date(),
};

const mockModelConfig = {
  id: 'model-1',
  userId: 'user-1',
  modelId: 'gemini-2.5-flash',
  provider: 'google',
  apiKeyEnc: 'encrypted:test-key',
  maxTokens: 1000,
  temperature: 0.7,
  systemPrompt: 'You are a helpful assistant',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Users Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserConfig', () => {
    it('should return existing config', async () => {
      (prisma.userConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);

      const result = await usersService.getUserConfig('user-1');

      expect(result).toEqual(mockConfig);
    });

    it('should return defaults when no config exists', async () => {
      (prisma.userConfig.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await usersService.getUserConfig('user-1');

      expect(result).toEqual({
        theme: 'system',
        activeModelId: null,
        language: 'es',
        streamSpeed: 8,
        showTitle: true,
        autoDeleteDays: null,
      });
    });
  });

  describe('updateUserConfig', () => {
    it('should create config when it does not exist', async () => {
      (prisma.userConfig.upsert as jest.Mock).mockResolvedValue(mockConfig);

      const result = await usersService.updateUserConfig('user-1', {
        theme: 'dark',
        language: 'es',
      });

      expect(result).toEqual(mockConfig);
      expect(prisma.userConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          create: expect.objectContaining({
            userId: 'user-1',
            theme: 'dark',
            language: 'es',
          }),
          update: expect.objectContaining({
            theme: 'dark',
            language: 'es',
          }),
        }),
      );
    });

    it('should update existing config', async () => {
      const existingConfig = { ...mockConfig, theme: 'system' };
      const updatedConfig = { ...mockConfig, theme: 'dark' };
      (prisma.userConfig.upsert as jest.Mock).mockResolvedValue(updatedConfig);

      const result = await usersService.updateUserConfig('user-1', { theme: 'dark' });

      expect(result.theme).toBe('dark');
    });

    it('should handle autoDeleteDays', async () => {
      (prisma.userConfig.upsert as jest.Mock).mockResolvedValue(mockConfig);

      const result = await usersService.updateUserConfig('user-1', { autoDeleteDays: 30 });

      expect(result.autoDeleteDays).toBe(30);
    });

    it('should set autoDeleteDays to null when value is falsy', async () => {
      (prisma.userConfig.upsert as jest.Mock).mockResolvedValue({ ...mockConfig, autoDeleteDays: null });

      const result = await usersService.updateUserConfig('user-1', { autoDeleteDays: null });

      expect(result.autoDeleteDays).toBeNull();
    });
  });

  describe('getUserModels', () => {
    it('should return active models', async () => {
      (prisma.modelConfig.findMany as jest.Mock).mockResolvedValue([mockModelConfig]);

      const result = await usersService.getUserModels('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].modelId).toBe('gemini-2.5-flash');
    });

    it('should return empty array when no models', async () => {
      (prisma.modelConfig.findMany as jest.Mock).mockResolvedValue([]);

      const result = await usersService.getUserModels('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('addUserModel', () => {
    it('should create a new model config', async () => {
      (prisma.modelConfig.upsert as jest.Mock).mockResolvedValue(mockModelConfig);

      const result = await usersService.addUserModel('user-1', {
        modelId: 'gemini-2.5-flash',
        provider: 'google',
        apiKey: 'test-key',
        maxTokens: 1000,
        temperature: 0.7,
        systemPrompt: 'You are a helpful assistant',
      });

      expect(result.modelId).toBe('gemini-2.5-flash');
      expect(prisma.modelConfig.upsert).toHaveBeenCalled();
    });

    it('should throw when apiKey is missing', async () => {
      await expect(
        usersService.addUserModel('user-1', {
          modelId: 'gemini-2.5-flash',
          provider: 'google',
          apiKey: '',
        }),
      ).rejects.toThrow('API Key es requerida');
    });
  });

  describe('deleteUserModel', () => {
    it('should set model to inactive', async () => {
      (prisma.modelConfig.update as jest.Mock).mockResolvedValue({ ...mockModelConfig, isActive: false });

      await usersService.deleteUserModel('user-1', 'gemini-2.5-flash');

      expect(prisma.modelConfig.update).toHaveBeenCalledWith({
        where: {
          userId_modelId: { userId: 'user-1', modelId: 'gemini-2.5-flash' },
        },
        data: { isActive: false },
      });
    });
  });

  describe('getModelApiKey', () => {
    it('should return decrypted api key for active model', async () => {
      (prisma.modelConfig.findUnique as jest.Mock).mockResolvedValue(mockModelConfig);

      const result = await usersService.getModelApiKey('user-1', 'gemini-2.5-flash');

      expect(result).toBe('test-key');
    });

    it('should return null for inactive model', async () => {
      (prisma.modelConfig.findUnique as jest.Mock).mockResolvedValue({ ...mockModelConfig, isActive: false });

      const result = await usersService.getModelApiKey('user-1', 'gemini-2.5-flash');

      expect(result).toBeNull();
    });

    it('should return null when model not found', async () => {
      (prisma.modelConfig.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await usersService.getModelApiKey('user-1', 'nonexistent-model');

      expect(result).toBeNull();
    });
  });
});
