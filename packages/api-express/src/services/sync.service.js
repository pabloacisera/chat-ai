import prisma from '../config/db.js';
import * as anonService from './anon.service.js';
import { encrypt, decrypt } from './encryption.service.js';

export async function migrateAnonData(userId, anonSessionId) {
  const conversations = await anonService.getConversations(anonSessionId);
  
  const results = { migrated: 0, messages: 0 };

  for (const conv of conversations) {
    const messages = await anonService.getConversationMessages(anonSessionId, conv.id);

    const created = await prisma.conversation.create({
      data: {
        userId,
        title: conv.title,
        modelId: conv.modelId,
        provider: conv.provider,
        createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
        messages: {
          create: messages.map(m => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date()
          }))
        }
      }
    });

    results.migrated++;
    results.messages += messages.length;
  }

  const config = await anonService.getSessionConfig(anonSessionId);
  if (config) {
    await prisma.userConfig.upsert({
      where: { userId },
      create: { userId, ...config },
      update: config
    });
  }

  await prisma.migrationLog.create({
    data: {
      userId,
      anonSessionId,
      convCount: results.migrated,
      messageCount: results.messages,
      status: results.migrated > 0 ? 'success' : 'failed'
    }
  });

  await anonService.deleteSession(anonSessionId);

  return results;
}