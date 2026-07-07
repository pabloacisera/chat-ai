import prisma from '../config/db.js';
import { getModelApiKey, addUserModel } from './users.service.js';

const MODEL_DEFAULTS = {
  "gemini-2.5-flash": { maxTokens: 4096, temperature: 0.7 },
  "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo": { maxTokens: 4096, temperature: 0.7 },
  "llama-3.3-70b-versatile": { maxTokens: 4096, temperature: 0.7 },
  "mistral-small": { maxTokens: 4096, temperature: 0.7 }
};

export async function createMessage(userId, conversationId, content, modelId, providedApiKey = null) {
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

  const finalModelId = modelId || conversation.modelId;
  let apiKey = providedApiKey;

  if (!apiKey) {
    apiKey = await getModelApiKey(userId, finalModelId);
  } else {
    // Si nos proveen una API Key, la guardamos/actualizamos para que quede persistida en la cuenta del usuario
    try {
      await addUserModel(userId, {
        modelId: finalModelId,
        provider: conversation.provider,
        apiKey: providedApiKey
      });
    } catch (e) {
      console.error('Error auto-guardando API Key:', e.message);
    }
  }

  if (!apiKey) {
    throw new Error('No hay API Key configurada para este modelo');
  }

  const defaults = MODEL_DEFAULTS[finalModelId] || { maxTokens: 4096, temperature: 0.7 };

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
    modelId: finalModelId,
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