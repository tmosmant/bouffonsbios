-- Production (voir database_name dans wrangler.jsonc) :
--   npx wrangler d1 execute bouffonsbios-newsletter --remote --file=schema/migrations/0002_subscriber_name.sql
-- Local :
--   npx wrangler d1 execute bouffonsbios-newsletter --local --file=schema/migrations/0002_subscriber_name.sql
ALTER TABLE subscribers ADD COLUMN name TEXT NOT NULL DEFAULT '';
