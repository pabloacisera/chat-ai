import prisma from '../src/config/db.js';
import * as messagesService from '../src/services/messages.service.js';

jest.mock('../src/services/encryption.service.js', () => ({
  encrypt: (text: string) => `encrypted:${text}`,
  decrypt: (text: string) => text?.replace('encrypted:', '') || null,
}));

jest.mock('../src/services/ai.service.js', () => ({
  MODEL_DEFAULTS: {
    'gemini-2.5-flash': { maxTokens: 8192, temperature: 0.7 },
  },
}));

const mockConversation = {
  id: 'conv-1',
  userId: 'user-1',
  title: 'Test',
  modelId: 'gemini-2.5-flash',
  provider: 'google',
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
  isArchived: false,
};

const mockUserMessage = {
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: 'Hello',
  createdAt: new Date(),
  isDeleted: false,
};

describe('Messages Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    it('should create a user message successfully', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.modelConfig.findUnique as jest.Mock).mockResolvedValue({
        id: 'model-1',
        userId: 'user-1',
        modelId: 'gemini-2.5-flash',
        provider: 'google',
        apiKeyEnc: 'encrypted:test-key',
        isActive: true,
      });
      (prisma.message.create as jest.Mock).mockResolvedValue(mockUserMessage);

      const result = await messagesService.createMessage('user-1', 'conv-1', 'Hello', 'gemini-2.5-flash');

      expect(result.userMessage.role).toBe('user');
      expect(result.userMessage.content).toBe('Hello');
      expect(result.modelId).toBe('gemini-2.5-flash');
    });

    it('should throw when conversation not found', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        messagesService.createMessage('user-1', 'conv-1', 'Hello', 'gemini-2.5-flash'),
      ).rejects.toThrow('Conversación no encontrada');
    });

    it('should throw when no api key is available', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.modelConfig.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        messagesService.createMessage('user-1', 'conv-1', 'Hello', 'gemini-2.5-flash'),
      ).rejects.toThrow('No hay API Key configurada para este modelo');
    });

    it('should use provided api key when given', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.modelConfig.upsert as jest.Mock).mockResolvedValue({});
      (prisma.message.create as jest.Mock).mockResolvedValue(mockUserMessage);

      const result = await messagesService.createMessage('user-1', 'conv-1', 'Hello', 'gemini-2.5-flash', 'provided-key' as any);

      expect(result.apiKey).toBe('provided-key');
      expect(prisma.modelConfig.upsert).toHaveBeenCalled();
    });

    it('should use conversation modelId when not provided', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.modelConfig.findUnique as jest.Mock).mockResolvedValue({
        id: 'model-1',
        userId: 'user-1',
        modelId: 'gemini-2.5-flash',
        provider: 'google',
        apiKeyEnc: 'encrypted:test-key',
        isActive: true,
      });
      (prisma.message.create as jest.Mock).mockResolvedValue(mockUserMessage);

      const result = await messagesService.createMessage('user-1', 'conv-1', 'Hello', null);

      expect(result.modelId).toBe('gemini-2.5-flash');
    });
  });

  describe('saveAssistantMessage', () => {
    it('should save an assistant message', async () => {
      const mockAssistantMessage = { ...mockUserMessage, role: 'assistant', content: 'Hi there!' };
      (prisma.message.create as jest.Mock).mockResolvedValue(mockAssistantMessage);

      const result = await messagesService.saveAssistantMessage('conv-1', 'Hi there!');

      expect(result.role).toBe('assistant');
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Hi there!',
        },
      });
    });
  });

  describe('updateConversationTimestamp', () => {
    it('should update the conversation timestamp', async () => {
      (prisma.conversation.update as jest.Mock).mockResolvedValue({ ...mockConversation, updatedAt: new Date() });

      await messagesService.updateConversationTimestamp('conv-1');

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });
});
