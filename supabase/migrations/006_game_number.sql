-- =====================================================================
-- Номер новой игры назначает сервер, повторное сохранение не дублирует игру
-- =====================================================================
-- Запустить в Supabase → SQL Editor на уже развёрнутой базе (после 003).
-- Для новых проектов функция уже есть в supabase/init.sql.
--
-- 1. Номер новой игры раньше считался в браузере по уже загруженному
--    списку. Два ведущих, заносящих игры одновременно, получали один номер,
--    и второе сохранение падало на unique (season_id, game_number). Теперь
--    номер = max + 1 в сезоне, под блокировкой на сезон.
-- 2. Приложение заранее даёт новой игре id (new_id). Если ответ сервера
--    потерялся, а игра записалась, повторное сохранение вернёт ту же игру,
--    а не создаст вторую.
--
-- Сигнатура и результат прежние — старая версия сайта продолжает работать.
-- =====================================================================

create or replace function save_game(p_game jsonb, p_players jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id     uuid := nullif(p_game->>'id', '')::uuid;
  v_new_id uuid := nullif(p_game->>'new_id', '')::uuid;
  v_season uuid := nullif(p_game->>'season_id', '')::uuid;
begin
  if not is_admin() then
    raise exception 'Недостаточно прав для сохранения игры' using errcode = '42501';
  end if;

  if v_id is null then
    -- Параллельные сохранения в один сезон выполняются по очереди: каждое
    -- видит номер предыдущего, а повтор запроса — уже записанную игру
    perform pg_advisory_xact_lock(hashtext('save_game:' || v_season::text));

    -- Повтор запроса, игра уже сохранена
    if v_new_id is not null and exists (select 1 from games where id = v_new_id) then
      return v_new_id;
    end if;

    insert into games (
      id, season_id, tournament_id, game_number, date, winner, notes,
      first_killed, best_move_seat_1, best_move_seat_2, best_move_seat_3
    ) values (
      coalesce(v_new_id, gen_random_uuid()),
      v_season,
      nullif(p_game->>'tournament_id', '')::uuid,
      (select coalesce(max(game_number), 0) + 1 from games where season_id = v_season),
      coalesce((p_game->>'date')::timestamptz, now()),
      p_game->>'winner',
      p_game->>'notes',
      nullif(p_game->>'first_killed', '')::uuid,
      (p_game->>'best_move_seat_1')::integer,
      (p_game->>'best_move_seat_2')::integer,
      (p_game->>'best_move_seat_3')::integer
    )
    returning id into v_id;
  else
    update games set
      tournament_id    = nullif(p_game->>'tournament_id', '')::uuid,
      date             = coalesce((p_game->>'date')::timestamptz, date),
      winner           = p_game->>'winner',
      notes            = p_game->>'notes',
      first_killed     = nullif(p_game->>'first_killed', '')::uuid,
      best_move_seat_1 = (p_game->>'best_move_seat_1')::integer,
      best_move_seat_2 = (p_game->>'best_move_seat_2')::integer,
      best_move_seat_3 = (p_game->>'best_move_seat_3')::integer
    where id = v_id;

    if not found then
      raise exception 'Игра % не найдена', v_id using errcode = 'P0002';
    end if;

    delete from game_players where game_id = v_id;
  end if;

  insert into game_players (
    game_id, player_id, seat, role, result,
    base_score, bonus_score, bonus_comment, total_score
  )
  select
    v_id, x.player_id, x.seat, x.role, x.result,
    coalesce(x.base_score, 0), coalesce(x.bonus_score, 0),
    x.bonus_comment, coalesce(x.total_score, 0)
  from jsonb_to_recordset(p_players) as x(
    player_id uuid, seat integer, role text, result text,
    base_score numeric, bonus_score numeric, bonus_comment text, total_score numeric
  );

  return v_id;
end;
$$;
