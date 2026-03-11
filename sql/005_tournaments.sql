-- 005: Tournaments (game evenings)
-- Промежуточный уровень: Сезон → Турнир → Игра

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tournaments_season ON tournaments(season_id);

-- Nullable: обратная совместимость — старые игры остаются без турнира
ALTER TABLE games ADD COLUMN tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL;

CREATE INDEX idx_games_tournament ON games(tournament_id);

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_select" ON tournaments FOR SELECT USING (true);
CREATE POLICY "tournaments_insert" ON tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "tournaments_update" ON tournaments FOR UPDATE USING (true);
CREATE POLICY "tournaments_delete" ON tournaments FOR DELETE USING (true);
