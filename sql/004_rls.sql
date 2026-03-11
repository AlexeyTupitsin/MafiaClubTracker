-- Включаем RLS на всех таблицах
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Вспомогательная функция: проверка роли admin
CREATE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- SEASONS: все читают, только admin пишет
CREATE POLICY "seasons_read" ON seasons FOR SELECT USING (true);
CREATE POLICY "seasons_write" ON seasons FOR ALL USING (is_admin());

-- PLAYERS: все читают, только admin пишет
CREATE POLICY "players_read" ON players FOR SELECT USING (true);
CREATE POLICY "players_write" ON players FOR ALL USING (is_admin());

-- GAMES: все читают, только admin пишет
CREATE POLICY "games_read" ON games FOR SELECT USING (true);
CREATE POLICY "games_write" ON games FOR ALL USING (is_admin());

-- GAME_PLAYERS: все читают, только admin пишет
CREATE POLICY "game_players_read" ON game_players FOR SELECT USING (true);
CREATE POLICY "game_players_write" ON game_players FOR ALL USING (is_admin());

-- PROFILES: каждый видит свой, admin видит все
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT USING (
  id = auth.uid() OR is_admin()
);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
