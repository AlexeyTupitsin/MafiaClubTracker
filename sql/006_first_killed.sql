-- Season: track first kill feature
ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS track_first_kill BOOLEAN NOT NULL DEFAULT false;

-- Game: first killed player
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS first_killed UUID REFERENCES players(id) ON DELETE SET NULL;

-- Index for first_killed lookups
CREATE INDEX IF NOT EXISTS idx_games_first_killed ON games(first_killed)
  WHERE first_killed IS NOT NULL;
