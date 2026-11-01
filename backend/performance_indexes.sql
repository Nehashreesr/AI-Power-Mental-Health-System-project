-- Optional: run once in your PostgreSQL database.
-- Makes chat history and mood lookups fast as the tables grow.
-- Safe to run more than once; changes no data and no behaviour.

CREATE INDEX IF NOT EXISTS idx_chat_messages_uid_created
    ON chat_messages (firebase_uid, created_at);

CREATE INDEX IF NOT EXISTS idx_mood_entries_uid_created
    ON mood_entries (firebase_uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid
    ON users (firebase_uid);
