import * as archiveService from '../services/archive.service.js';

export async function getConversations(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const conversations = archiveService.getArchivedConversations(req.userId, limit, offset);
    res.json(conversations);
  } catch (error) {
    next(error);
  }
}

export async function getConversation(req, res, next) {
  try {
    const { id } = req.params;
    const conversation = archiveService.getArchivedConversation(id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación archivada no encontrada' });
    }
    
    res.json(conversation);
  } catch (error) {
    next(error);
  }
}

export async function getCount(req, res, next) {
  try {
    const count = archiveService.getArchivedCount(req.userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
}