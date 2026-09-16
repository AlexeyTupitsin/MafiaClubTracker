-- =====================================================================
-- ELO-рейтинг игроков
-- =====================================================================
-- Запустить в Supabase → SQL Editor на уже развёрнутой базе.
-- Для новых проектов колонки уже есть в supabase/init.sql.
--
-- После применения: зайти в приложение админом →
-- Настройки → Данные → «Пересчитать ELO».
-- =====================================================================

alter table game_players
  add column if not exists elo_before   integer,
  add column if not exists elo_expected numeric(12,4),
  add column if not exists elo_k        integer,
  add column if not exists elo_delta    numeric(12,3),
  add column if not exists elo_after    integer;

alter table players
  add column if not exists elo       integer not null default 1000,
  add column if not exists elo_games integer not null default 0;

create index if not exists game_players_elo_idx
  on game_players (player_id) where elo_after is not null;
