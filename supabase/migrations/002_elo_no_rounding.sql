-- =====================================================================
-- ELO без округления
-- =====================================================================
-- Запустить в Supabase → SQL Editor на уже развёрнутой базе.
-- Для новых проектов типы уже исправлены в supabase/init.sql.
--
-- После применения: зайти в приложение админом →
-- Настройки → Данные → «Пересчитать ELO».
-- =====================================================================

alter table game_players
  alter column elo_before   type numeric,
  alter column elo_expected type numeric,
  alter column elo_delta    type numeric,
  alter column elo_after    type numeric;

alter table players
  alter column elo type numeric;
