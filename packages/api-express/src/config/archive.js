import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'archive.db');
const archiveDb = new Database(dbPath);

archiveDb.exec(`
  CREATE TABLE IF NOT EXISTS archived_conversations (
    id TEXT PRIMARY KEY,
    original_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    model_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    archived_at TEXT NOT NULL,
    original_created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS archived_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES archived_conversations(id)
  );

  CREATE INDEX IF NOT EXISTS idx_archived_conversations_user_id ON archived_conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_archived_messages_conversation_id ON archived_messages(conversation_id);
`);

console.log('✅ Base de datos de archivo SQLite inicializada');

export default archiveDb;