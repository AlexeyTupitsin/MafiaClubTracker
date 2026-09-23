-- =====================================================================
-- Импорт данных одной транзакцией
-- =====================================================================
-- Запустить в Supabase → SQL Editor на уже развёрнутой базе.
-- Для новых проектов функция уже есть в supabase/init.sql.
--
-- Раньше импорт из приложения сначала удалял все данные, а потом вставлял
-- записи сотнями отдельных запросов. Сбой на середине оставлял базу
-- полупустой. Теперь удаление и вставка идут одной транзакцией: при любой
-- ошибке база остаётся как была.
-- =====================================================================

-- p_data — файл экспорта из приложения (формат exportAllData, version 2):
-- { seasons: [...], players: [...], tournaments: [...], games: { <id сезона>: [...] } }
-- id из файла заменяются новыми uuid, ссылки между записями переводятся на них.
create or replace function import_data(p_data jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  -- старый id → новый uuid
  v_seasons     jsonb;
  v_players     jsonb;
  v_tournaments jsonb;
  v_game        record;
  v_game_id     uuid;
begin
  if not is_admin() then
    raise exception 'Недостаточно прав для импорта' using errcode = '42501';
  end if;

  -- where true: Supabase не пропускает DELETE без WHERE (pg_safeupdate)
  delete from game_players where true;
  delete from games        where true;
  delete from tournaments  where true;
  delete from players      where true;
  delete from seasons      where true;

  -- Сезоны
  select coalesce(jsonb_object_agg(s->>'id', gen_random_uuid()), '{}')
  into v_seasons
  from jsonb_array_elements(coalesce(p_data->'seasons', '[]')) s;

  insert into seasons (
    id, name, start_date, end_date, is_active, track_first_kill, track_best_move,
    rating_threshold_type, rating_threshold_value
  )
  select
    (v_seasons->>(s->>'id'))::uuid,
    s->>'name',
    (s->>'startDate')::date,
    nullif(s->>'endDate', '')::date,
    coalesce((s->>'isActive')::boolean, false),
    coalesce((s->>'trackFirstKill')::boolean, false),
    coalesce((s->>'trackBestMove')::boolean, false),
    coalesce(nullif(s->>'ratingThresholdType', ''), 'none'),
    coalesce((s->>'ratingThresholdValue')::integer, 0)
  from jsonb_array_elements(coalesce(p_data->'seasons', '[]')) s;

  -- Игроки
  select coalesce(jsonb_object_agg(p->>'id', gen_random_uuid()), '{}')
  into v_players
  from jsonb_array_elements(coalesce(p_data->'players', '[]')) p;

  insert into players (id, nickname, real_name, is_active, avatar_url)
  select
    (v_players->>(p->>'id'))::uuid,
    p->>'nickname',
    nullif(p->>'realName', ''),
    coalesce((p->>'isActive')::boolean, true),
    nullif(p->>'avatarUrl', '')
  from jsonb_array_elements(coalesce(p_data->'players', '[]')) p;

  -- Турниры
  select coalesce(jsonb_object_agg(t->>'id', gen_random_uuid()), '{}')
  into v_tournaments
  from jsonb_array_elements(coalesce(p_data->'tournaments', '[]')) t;

  insert into tournaments (id, season_id, name, date, notes)
  select
    (v_tournaments->>(t->>'id'))::uuid,
    (v_seasons->>(t->>'seasonId'))::uuid,
    t->>'name',
    (t->>'date')::date,
    nullif(t->>'notes', '')
  from jsonb_array_elements(coalesce(p_data->'tournaments', '[]')) t;

  -- Игры с составом. Неизвестный сезон или игрок даст null в NOT NULL
  -- колонке — ошибка откатит весь импорт.
  for v_game in
    select (v_seasons->>sg.key)::uuid as season_id, g.value as data
    from jsonb_each(coalesce(p_data->'games', '{}')) sg
    cross join lateral jsonb_array_elements(sg.value) g
  loop
    insert into games (
      season_id, tournament_id, game_number, date, winner, notes,
      first_killed, best_move_seat_1, best_move_seat_2, best_move_seat_3
    ) values (
      v_game.season_id,
      (v_tournaments->>(v_game.data->>'tournamentId'))::uuid,
      (v_game.data->>'gameNumber')::integer,
      coalesce((v_game.data->>'date')::timestamptz, now()),
      v_game.data->>'winner',
      nullif(v_game.data->>'notes', ''),
      (v_players->>(v_game.data->>'firstKilled'))::uuid,
      (v_game.data->>'bestMoveSeat1')::integer,
      (v_game.data->>'bestMoveSeat2')::integer,
      (v_game.data->>'bestMoveSeat3')::integer
    )
    returning id into v_game_id;

    insert into game_players (
      game_id, player_id, seat, role, result,
      base_score, bonus_score, bonus_comment, total_score
    )
    select
      v_game_id,
      (v_players->>(gp->>'playerId'))::uuid,
      (gp->>'seat')::integer,
      gp->>'role',
      gp->>'result',
      coalesce((gp->>'baseScore')::numeric, 0),
      coalesce((gp->>'bonusScore')::numeric, 0),
      nullif(gp->>'bonusComment', ''),
      coalesce((gp->>'totalScore')::numeric, 0)
    from jsonb_array_elements(coalesce(v_game.data->'players', '[]')) gp;
  end loop;
end;
$$;

grant execute on function import_data(jsonb) to authenticated;
