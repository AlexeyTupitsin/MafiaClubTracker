-- =====================================================================
-- Атомарное сохранение игры и пересчёта ELO
-- =====================================================================
-- Запустить в Supabase → SQL Editor на уже развёрнутой базе.
-- Для новых проектов функции уже есть в supabase/init.sql.
--
-- Каждая функция выполняется одной транзакцией: либо применяется всё,
-- либо ничего. Раньше редактирование игры удаляло game_players отдельным
-- запросом, и сбой на вставке оставлял игру без игроков.
--
-- security invoker: работают RLS-политики вызывающего пользователя,
-- явная проверка is_admin() даёт понятную ошибку вместо «0 строк».
-- =====================================================================

-- Создание (p_game.id пустой) или обновление игры вместе с составом.
-- Возвращает id игры.
create or replace function save_game(p_game jsonb, p_players jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := nullif(p_game->>'id', '')::uuid;
begin
  if not is_admin() then
    raise exception 'Недостаточно прав для сохранения игры' using errcode = '42501';
  end if;

  if v_id is null then
    insert into games (
      season_id, tournament_id, game_number, date, winner, notes,
      first_killed, best_move_seat_1, best_move_seat_2, best_move_seat_3
    ) values (
      (p_game->>'season_id')::uuid,
      nullif(p_game->>'tournament_id', '')::uuid,
      (p_game->>'game_number')::integer,
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

-- Запись результатов пересчёта ELO одной транзакцией.
-- Обновляет только ELO-колонки, остальные поля строк не трогает.
create or replace function apply_elo(p_game_players jsonb, p_players jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Недостаточно прав для пересчёта ELO' using errcode = '42501';
  end if;

  update game_players gp set
    elo_before   = x.elo_before,
    elo_expected = x.elo_expected,
    elo_k        = x.elo_k,
    elo_delta    = x.elo_delta,
    elo_after    = x.elo_after
  from jsonb_to_recordset(p_game_players) as x(
    id uuid, elo_before numeric, elo_expected numeric,
    elo_k integer, elo_delta numeric, elo_after numeric
  )
  where gp.id = x.id;

  update players p set
    elo       = x.elo,
    elo_games = x.elo_games
  from jsonb_to_recordset(p_players) as x(id uuid, elo numeric, elo_games integer)
  where p.id = x.id;
end;
$$;

grant execute on function save_game(jsonb, jsonb) to authenticated;
grant execute on function apply_elo(jsonb, jsonb) to authenticated;
