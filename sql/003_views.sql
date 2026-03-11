-- Статистика игрока (для рейтинга)
CREATE VIEW player_stats AS
SELECT
  gp.player_id,
  p.nickname,
  g.season_id,
  COUNT(*) AS total_games,
  COUNT(*) FILTER (WHERE gp.result = 'win') AS wins,
  ROUND(COUNT(*) FILTER (WHERE gp.result = 'win')::numeric / COUNT(*) * 100, 1) AS winrate,
  SUM(gp.total_score) AS total_score,
  ROUND(SUM(gp.total_score)::numeric / COUNT(*), 2) AS avg_score
FROM game_players gp
JOIN games g ON g.id = gp.game_id
JOIN players p ON p.id = gp.player_id
GROUP BY gp.player_id, p.nickname, g.season_id;

-- Статистика по ролям
CREATE VIEW player_role_stats AS
SELECT
  gp.player_id,
  g.season_id,
  gp.role,
  COUNT(*) AS total_games,
  COUNT(*) FILTER (WHERE gp.result = 'win') AS wins,
  ROUND(COUNT(*) FILTER (WHERE gp.result = 'win')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS winrate,
  ROUND(SUM(gp.total_score)::numeric / NULLIF(COUNT(*), 0), 2) AS avg_score
FROM game_players gp
JOIN games g ON g.id = gp.game_id
GROUP BY gp.player_id, g.season_id, gp.role;

-- Статистика сезона (для дашборда)
CREATE VIEW season_stats AS
SELECT
  g.season_id,
  COUNT(*) AS total_games,
  COUNT(*) FILTER (WHERE g.winner = 'red') AS red_wins,
  COUNT(*) FILTER (WHERE g.winner = 'black') AS black_wins,
  ROUND(COUNT(*) FILTER (WHERE g.winner = 'red')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS red_winrate,
  ROUND(AVG(gp_avg.avg_total), 2) AS avg_score
FROM games g
LEFT JOIN (
  SELECT game_id, AVG(total_score) AS avg_total FROM game_players GROUP BY game_id
) gp_avg ON gp_avg.game_id = g.id
GROUP BY g.season_id;
