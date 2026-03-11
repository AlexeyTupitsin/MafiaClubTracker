CREATE INDEX idx_games_season ON games(season_id);
CREATE INDEX idx_games_date ON games(date DESC);
CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_player ON game_players(player_id);
CREATE INDEX idx_game_players_role ON game_players(role);
