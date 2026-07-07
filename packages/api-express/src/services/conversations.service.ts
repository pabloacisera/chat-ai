import prisma from '../config/db.js';

export const MAX_CONVERSATIONS = 100;

export async function cleanupOldConversations(userId: string) {
  const config = await prisma.userConfig.findUnique({ where: { userId } });
  if (!config?.autoDeleteDays) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.autoDeleteDays);

  const result = await prisma.conversation.updateMany({
    where: {
      userId,
      isDeleted: false,
      updatedAt: { lt: cutoff },
    },
    data: { isDeleted: true },
  });

  return result.count;
}

export async function getConversations(userId: string, limit = 50, offset = 0) {
  await cleanupOldConversations(userId);

  return prisma.conversation.findMany({
    where: {
      userId,
      isDeleted: false,
      isArchived: false,
    },
    select: {
      id: true,
      title: true,
      modelId: true,
      provider: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function getConversationCount(userId: string) {
  return prisma.conversation.count({
    where: {
      userId,
      isDeleted: false,
      isArchived: false,
    },
  });
}

export async function getConversationById(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
      isDeleted: false,
    },
    include: {
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function createConversation(userId: string, data: { title?: string; modelId: string; provider: string }) {
  const count = await getConversationCount(userId);
  if (count >= MAX_CONVERSATIONS) {
    throw new Error(
      `Has alcanzado el límite de ${MAX_CONVERSATIONS} conversaciones. Archiva o elimina algunas para crear una nueva.`,
    );
  }

  return prisma.conversation.create({
    data: {
      userId,
      title: data.title || 'Nueva conversación',
      modelId: data.modelId,
      provider: data.provider,
    },
  });
}

export async function updateConversation(conversationId: string, userId: string, data: { title?: string }) {
  return prisma.conversation.updateMany({
    where: {
      id: conversationId,
      userId,
      isDeleted: false,
    },
    data: {
      ...(data.title && { title: data.title }),
    },
  });
}

export async function deleteConversation(conversationId, userId) {
  return prisma.conversation.updateMany({
    where: {
      id: conversationId,
      userId,
    },
    data: { isDeleted: true },
  });
}

export async function deleteConversations(conversationIds: string[], userId: string) {
  return prisma.conversation.updateMany({
    where: {
      id: { in: conversationIds },
      userId,
    },
    data: { isDeleted: true },
  });
}

export async function archiveConversations(conversationIds, userId, archiveDb) {
  const conversations = await prisma.conversation.findMany({
    where: {
      id: { in: conversationIds },
      userId,
    },
    include: {
      messages: true,
    },
  });

  const insertConv = archiveDb.prepare(`
    INSERT INTO archived_conversations (id, original_id, user_id, title, model_id, provider, archived_at, original_created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMsg = archiveDb.prepare(`
    INSERT INTO archived_messages (id, conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const conv of conversations) {
    const archivedId = `archived_${conv.id}`;

    insertConv.run(
      archivedId,
      conv.id,
      conv.userId,
      conv.title,
      conv.modelId,
      conv.provider,
      new Date().toISOString(),
      conv.createdAt.toISOString(),
    );

    for (const msg of conv.messages) {
      insertMsg.run(`archived_${msg.id}`, archivedId, msg.role, msg.content, msg.createdAt.toISOString());
    }
  }

  return prisma.conversation.updateMany({
    where: {
      id: { in: conversationIds },
      userId,
    },
    data: { isArchived: true },
  });
}

export async function archiveAllConversations(userId: string, archiveDb: Record<string, unknown>) {
  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      isDeleted: false,
      isArchived: false,
    },
    include: {
      messages: true,
    },
  });

  const convIds = conversations.map((c) => c.id);
  return archiveConversations(convIds, userId, archiveDb);
}
