import prisma from '../config/db.js';
import { callAI } from './ai.service.js';

export async function buildContext(conversationId) {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      isDeleted: false
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });

  if (!conversation) {
    return [];
  }

  const messageCount = messages.length;

  if (messageCount <= 10) {
    return messages.map(msg => ({ role: msg.role, content: msg.content }));
  }

  if (messageCount > 10 && conversation.summary) {
    const summaryMessage = {
      role: 'assistant',
      content: '[Resumen de conversación previa]: ' + conversation.summary
    };
    const recentMessages = messages.slice(-6).map(msg => ({ role: msg.role, content: msg.content }));
    return [summaryMessage, ...recentMessages];
  }

  if (messageCount > 10 && !conversation.summary) {
    return messages.slice(-10).map(msg => ({ role: msg.role, content: msg.content }));
  }

  return messages.map(msg => ({ role: msg.role, content: msg.content }));
}

export async function updateSummaryIfNeeded(conversationId, model, apiKey) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return;
    }

    const messageCount = await prisma.message.count({
      where: {
        conversationId,
        isDeleted: false
      }
    });

    const messageCountAtLastSummary = conversation.messageCountAtLastSummary || 0;

    if ((messageCount - messageCountAtLastSummary) < 10) {
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const formattedMessages = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    const summaryPrompt = `Eres un asistente que genera resúmenes concisos de conversaciones. Resume la siguiente conversación en no más de 200 palabras, en el mismo idioma en que está escrita, capturando los temas principales, decisiones y contexto importante:\n${formattedMessages}`;

    const summary = await callAI(summaryPrompt, model, apiKey, {
      maxTokens: 1000,
      temperature: 0.3
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        summary,
        summaryUpdatedAt: new Date(),
        messageCountAtLastSummary: messageCount
      }
    });
  } catch (error) {
    console.error('Error actualizando summary:', error);
    return;
  }
}