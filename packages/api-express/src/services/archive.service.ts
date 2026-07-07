import archiveDb from '../config/archive.js';

export function getArchivedConversations(userId: string, limit = 50, offset = 0) {
  const stmt = archiveDb.prepare(`
    SELECT id, original_id, title, model_id, provider, archived_at, original_created_at
    FROM archived_conversations
    WHERE user_id = ?
    ORDER BY archived_at DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(userId, limit, offset);
}

export function getArchivedConversation(convId: string) {
  const convStmt = archiveDb.prepare(`
    SELECT * FROM archived_conversations WHERE id = ?
  `);
  const conv = convStmt.get(convId) as Record<string, unknown> | undefined;

  if (!conv) return null;

  const msgStmt = archiveDb.prepare(`
    SELECT * FROM archived_messages WHERE conversation_id = ? ORDER BY created_at ASC
  `);
  const messages = msgStmt.all(convId);

  return { ...conv, messages };
}

export function getArchivedCount(userId: string): number {
  const stmt = archiveDb.prepare(`
    SELECT COUNT(*) as count FROM archived_conversations WHERE user_id = ?
  `);
  const result = stmt.get(userId) as { count: number };
  return result.count;
}
