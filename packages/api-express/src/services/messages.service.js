import prisma from '../config/db.js';
import { getModelApiKey } from './users.service.js';

const MODEL_DEFAULTS = {
  "gemini-2.5-flash": { maxTokens: 4096, temperature: 0.7 },
  "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo": { maxTokens: 4096, temperature: 0.7 },
  "llama-3.3-70b-versatile": { maxTokens: 4096, temperature: 0.7 },
  "mistral-small": { maxTokens: 4096, temperature: 0.7 }
};

export async function createMessage(userId, conversationId, content, modelId) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
      isDeleted: false
    }
  });

  if (!conversation) {
    throw new Error('Conversación no encontrada');
  }

  const apiKey = await getModelApiKey(userId, modelId || conversation.modelId);
  if (!apiKey) {
    throw new Error('No hay API Key configurada para este modelo');
  }

  const modelConfig = modelId || conversation.modelId;
  const defaults = MODEL_DEFAULTS[modelConfig] || { maxTokens: 4096, temperature: 0.7 };

  const userMessage = await prisma.message.create({
    data: {
      conversationId,
      role: 'user',
      content
    }
  });

  return {
    userMessage,
    conversation,
    modelId: modelConfig,
    apiKey,
    defaults
  };
}

export async function saveAssistantMessage(conversationId, content) {
  return prisma.message.create({
    data: {
      conversationId,
      role: 'assistant',
      content
    }
  });
}

export async function updateConversationTimestamp(conversationId) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() }
  });
}