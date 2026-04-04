CREATE TABLE IF NOT EXISTS subscribers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    UNIQUE NOT NULL,
  name          TEXT    NOT NULL DEFAULT '',
  source        TEXT    NOT NULL DEFAULT 'site',
  subscribed_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);
