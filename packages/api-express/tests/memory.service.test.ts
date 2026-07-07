import prisma from '../src/config/db.js';
import * as memoryService from '../src/services/memory.service.js';

jest.mock('../src/services/ai.service.js', () => ({
  callAI: jest.fn().mockResolvedValue('Resumen de la conversación'),
}));

function makeMessage(role: string, content: string, i: number) {
  return {
    id: `msg-${i}`,
    conversationId: 'conv-1',
    role,
    content,
    createdAt: new Date(),
    isDeleted: false,
  };
}

function makeConversation(overrides = {}) {
  return {
    id: 'conv-1',
    userId: 'user-1',
    title: 'Test',
    modelId: 'gemini-2.5-flash',
    provider: 'google',
    summary: null,
    summaryUpdatedAt: null,
    messageCountAtLastSummary: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    isArchived: false,
    ...overrides,
  };
}

describe('Memory Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildContext', () => {
    it('should return all messages when 10 or fewer', async () => {
      const messages = Array.from({ length: 5 }, (_, i) => makeMessage('user', `msg ${i}`, i));
      (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(makeConversation());

      const result = await memoryService.buildContext('conv-1');

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ role: 'user', content: 'msg 0' });
    });

    it('should return empty array when conversation not found', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await memoryService.buildContext('conv-1');

      expect(result).toEqual([]);
    });

    it('should include summary when > 10 messages and summary exists', async () => {
      const messages = Array.from({ length: 15 }, (_, i) => makeMessage('user', `msg ${i}`, i));
      const conversation = makeConversation({ summary: 'Existing summary' });
      (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(conversation);

      const result = await memoryService.buildContext('conv-1');

      expect(result[0].content).toContain('Existing summary');
      expect(result).toHaveLength(7);
    });

    it('should return last 10 messages when > 10 and no summary', async () => {
      const messages = Array.from({ length: 15 }, (_, i) => makeMessage('user', `msg ${i}`, i));
      (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(makeConversation());

      const result = await memoryService.buildContext('conv-1');

      expect(result).toHaveLength(10);
      expect(result[0].content).toBe('msg 5');
    });
  });

  describe('updateSummaryIfNeeded', () => {
    it('should skip when not enough new messages', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(
        makeConversation({ messageCountAtLastSummary: 5 }),
      );
      (prisma.message.count as jest.Mock).mockResolvedValue(8);

      await memoryService.updateSummaryIfNeeded('conv-1', 'gemini-2.5-flash', 'api-key');

      expect(prisma.conversation.update).not.toHaveBeenCalled();
    });

    it('should generate summary when enough new messages', async () => {
      const messages = Array.from({ length: 15 }, (_, i) => makeMessage('user', `msg ${i}`, i));
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(
        makeConversation({ messageCountAtLastSummary: 0 }),
      );
      (prisma.message.count as jest.Mock).mockResolvedValue(15);
      (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);
      (prisma.conversation.update as jest.Mock).mockResolvedValue({});

      await memoryService.updateSummaryIfNeeded('conv-1', 'gemini-2.5-flash', 'api-key');

      expect(prisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
          data: expect.objectContaining({
            summary: 'Resumen de la conversación',
          }),
        }),
      );
    });

    it('should not throw when conversation not found', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        memoryService.updateSummaryIfNeeded('conv-1', 'gemini-2.5-flash', 'api-key'),
      ).resolves.toBeUndefined();
    });

    it('should handle AI errors gracefully', async () => {
      const { callAI } = require('../src/services/ai.service.js');
      (callAI as jest.Mock).mockRejectedValue(new Error('AI error'));
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(
        makeConversation({ messageCountAtLastSummary: 0 }),
      );
      (prisma.message.count as jest.Mock).mockResolvedValue(15);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([makeMessage('user', 'test', 0)]);

      await expect(
        memoryService.updateSummaryIfNeeded('conv-1', 'gemini-2.5-flash', 'api-key'),
      ).resolves.toBeUndefined();
    });
  });
});
