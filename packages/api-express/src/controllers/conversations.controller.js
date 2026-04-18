import * as conversationsService from '../services/conversations.service.js';
import archiveDb from '../config/archive.js';

export async function getConversations(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const conversations = await conversationsService.getConversations(req.userId, limit, offset);
    res.json(conversations);
  } catch (error) {
    next(error);
  }
}

export async function getConversationCount(req, res, next) {
  try {
    const count = await conversationsService.getConversationCount(req.userId);
    res.json({ count, max: conversationsService.MAX_CONVERSATIONS });
  } catch (error) {
    next(error);
  }
}

export async function getConversationMessages(req, res, next) {
  try {
    const { id } = req.params;
    const conversation = await conversationsService.getConversationById(id, req.userId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    
    res.json(conversation.messages);
  } catch (error) {
    next(error);
  }
}

export async function createConversation(req, res, next) {
  try {
    const { title, modelId, provider } = req.body;
    
    if (!modelId || !provider) {
      return res.status(400).json({ error: 'modelId y provider son requeridos' });
    }

    const conversation = await conversationsService.createConversation(req.userId, {
      title,
      modelId,
      provider
    });

    res.status(201).json(conversation);
  } catch (error) {
    if (error.message.includes('límite')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

export async function updateConversation(req, res, next) {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    const result = await conversationsService.updateConversation(id, req.userId, { title });
    
    if (result.count === 0) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    
    res.json({ message: 'Título actualizado' });
  } catch (error) {
    next(error);
  }
}

export async function deleteConversation(req, res, next) {
  try {
    const { id } = req.params;
    await conversationsService.deleteConversation(id, req.userId);
    res.json({ message: 'Conversación eliminada' });
  } catch (error) {
    next(error);
  }
}

export async function deleteBulk(req, res, next) {
  try {
    const { conversationIds } = req.body;
    
    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({ error: 'conversationIds es requerido y debe ser un array' });
    }
    
    await conversationsService.deleteConversations(conversationIds, req.userId);
    res.json({ message: 'Conversaciones eliminadas' });
  } catch (error) {
    next(error);
  }
}

export async function archiveBulk(req, res, next) {
  try {
    const { conversationIds } = req.body;
    
    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({ error: 'conversationIds es requerido y debe ser un array' });
    }
    
    await conversationsService.archiveConversations(conversationIds, req.userId, archiveDb);
    res.json({ message: 'Conversaciones archivadas' });
  } catch (error) {
    next(error);
  }
}

export async function archiveAll(req, res, next) {
  try {
    await conversationsService.archiveAllConversations(req.userId, archiveDb);
    res.json({ message: 'Todas las conversaciones archivadas' });
  } catch (error) {
    next(error);
  }
}