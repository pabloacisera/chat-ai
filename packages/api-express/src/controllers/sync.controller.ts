import * as syncService from '../services/sync.service.js';

export async function migrate(req, res, next) {
  try {
    const { anonSessionId } = req.body;

    if (!anonSessionId) {
      return res.status(400).json({ error: 'anonSessionId es requerido' });
    }

    const results = await syncService.migrateAnonData(req.userId, anonSessionId);
    res.json({ 
      message: 'Migración completada',
      migratedConversations: results.migrated,
      migratedMessages: results.messages
    });
  } catch (error) {
    next(error);
  }
}