-- GIN indexes for full-text search on forum content
-- Using 'simple' config (no language-specific stemming, works well for Vietnamese)

CREATE INDEX IF NOT EXISTS "ForumThread_title_fts_idx"
  ON "ForumThread" USING GIN (to_tsvector('simple', title));

CREATE INDEX IF NOT EXISTS "ForumPost_body_fts_idx"
  ON "ForumPost" USING GIN (to_tsvector('simple', body));
