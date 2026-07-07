import prisma from '../src/config/db.js';
import * as conversationsService from '../src/services/conversations.service.js';

jest.mock('better-sqlite3');

const mockConversation = {
  id: 'conv-1',
  userId: 'user-1',
  title: 'Test Conversation',
  modelId: 'gemini-2.5-flash',
  provider: 'google',
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
  isArchived: false,
};

const mockMessage = {
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: 'Hello',
  createdAt: new Date(),
  isDeleted: false,
};

describe('Conversations Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversations', () => {
    it('should return non-deleted, non-archived conversations', async () => {
      (prisma.userConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([mockConversation]);

      const result = await conversationsService.getConversations('user-1', 50, 0);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Conversation');
    });

    it('should respect limit and offset', async () => {
      (prisma.userConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([]);

      await conversationsService.getConversations('user-1', 10, 20);

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });
  });

  describe('cleanupOldConversations', () => {
    it('should not delete when autoDeleteDays is not set', async () => {
      (prisma.userConfig.findUnique as jest.Mock).mockResolvedValue({ autoDeleteDays: null });

      const result = await conversationsService.cleanupOldConversations('user-1');

      expect(result).toBe(0);
      expect(prisma.conversation.updateMany).not.toHaveBeenCalled();
    });

    it('should soft-delete conversations older than autoDeleteDays', async () => {
      (prisma.userConfig.findUnique as jest.Mock).mockResolvedValue({ autoDeleteDays: 30 });
      (prisma.conversation.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await conversationsService.cleanupOldConversations('user-1');

      expect(result).toBe(3);
      expect(prisma.conversation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isDeleted: true },
        }),
      );
    });

    it('should cleanup before returning conversations', async () => {
      (prisma.userConfig.findUnique as jest.Mock).mockResolvedValue({ autoDeleteDays: 7 });
      (prisma.conversation.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([mockConversation]);

      await conversationsService.getConversations('user-1', 50, 0);

      expect(prisma.conversation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDeleted: true } }),
      );
    });
  });

  describe('getConversationCount', () => {
    it('should return count of active conversations', async () => {
      (prisma.conversation.count as jest.Mock).mockResolvedValue(5);

      const result = await conversationsService.getConversationCount('user-1');

      expect(result).toBe(5);
    });
  });

  describe('getConversationById', () => {
    it('should return conversation with messages', async () => {
      const convWithMessages = { ...mockConversation, messages: [mockMessage] };
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(convWithMessages);

      const result = await conversationsService.getConversationById('conv-1', 'user-1');

      expect(result).toEqual(convWithMessages);
      expect(result!.messages).toHaveLength(1);
    });

    it('should return null for non-existent conversation', async () => {
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await conversationsService.getConversationById('conv-1', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('createConversation', () => {
    it('should create a conversation within limits', async () => {
      (prisma.conversation.count as jest.Mock).mockResolvedValue(0);
      (prisma.conversation.create as jest.Mock).mockResolvedValue(mockConversation);

      const result = await conversationsService.createConversation('user-1', {
        title: 'Test',
        modelId: 'gemini-2.5-flash',
        provider: 'google',
      });

      expect(result.title).toBe('Test Conversation');
    });

    it('should throw when at max conversations', async () => {
      (prisma.conversation.count as jest.Mock).mockResolvedValue(100);

      await expect(
        conversationsService.createConversation('user-1', {
          title: 'Test',
          modelId: 'gemini-2.5-flash',
          provider: 'google',
        }),
      ).rejects.toThrow('límite');
    });

    it('should use default title when not provided', async () => {
      (prisma.conversation.count as jest.Mock).mockResolvedValue(0);
      (prisma.conversation.create as jest.Mock).mockResolvedValue({ ...mockConversation, title: 'Nueva conversación' });

      const result = await conversationsService.createConversation('user-1', {
        modelId: 'gemini-2.5-flash',
        provider: 'google',
      });

      expect(result.title).toBe('Nueva conversación');
    });
  });

  describe('updateConversation', () => {
    it('should update conversation title', async () => {
      (prisma.conversation.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await conversationsService.updateConversation('conv-1', 'user-1', { title: 'New Title' });

      expect(result.count).toBe(1);
      expect(prisma.conversation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1', userId: 'user-1', isDeleted: false },
          data: { title: 'New Title' },
        }),
      );
    });
  });

  describe('deleteConversation', () => {
    it('should soft-delete a conversation', async () => {
      (prisma.conversation.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await conversationsService.deleteConversation('conv-1', 'user-1');

      expect(prisma.conversation.updateMany).toHaveBeenCalledWith({
        where: { id: 'conv-1', userId: 'user-1' },
        data: { isDeleted: true },
      });
    });
  });

  describe('deleteConversations', () => {
    it('should soft-delete multiple conversations', async () => {
      (prisma.conversation.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await conversationsService.deleteConversations(['conv-1', 'conv-2'], 'user-1');

      expect(prisma.conversation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['conv-1', 'conv-2'] }, userId: 'user-1' },
        data: { isDeleted: true },
      });
    });
  });
});
