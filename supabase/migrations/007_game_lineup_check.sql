-- =====================================================================
-- Проверка состава игры на сервере
-- =====================================================================
-- Запустить в Supabase → SQL Editor на уже развёрнутой базе (после 006).
-- Для новых проектов всё уже есть в supabase/init.sql.
--
-- Раньше состав проверяла только форма: save_game принял бы игру из
-- 7 игроков или с двумя шерифами. Теперь такое сохранение отклоняется
-- с понятной ошибкой. Импорт (import_data) не проверяется — в старых
-- данных могут быть нестандартные игры.
-- =====================================================================

-- Проверка состава игры: 10 игроков, роли 6 мирных / шериф / 2 мафии / дон,
-- результат каждого согласован с победителем, итог = база + доп. балл.
-- Места 1–10 и уникальность игроков проверяют ограничения game_players.
create or replace function check_game_lineup(p_winner text, p_players jsonb)
returns void
language plpgsql
immutable
set search_path = public
as $$
declare
  v record;
begin
  select
    count(*)                                   as total,
    count(*) filter (where role = 'citizen')   as citizens,
    count(*) filter (where role = 'sheriff')   as sheriffs,
    count(*) filter (where role = 'mafia')     as mafia,
    count(*) filter (where role = 'don')       as dons,
    count(*) filter (where result is distinct from
      case
        when p_winner = 'draw' then 'draw'
        when (case when role in ('citizen', 'sheriff') then 'red' else 'black' end) = p_winner then 'win'
        else 'lose'
      end)                                     as wrong_results,
    count(*) filter (where coalesce(total_score, 0) <> coalesce(base_score, 0) + coalesce(bonus_score, 0)) as wrong_totals
  into v
  from jsonb_to_recordset(coalesce(p_players, '[]')) as x(
    role text, result text, base_score numeric, bonus_score numeric, total_score numeric
  );

  if v.total <> 10 then
    raise exception 'В игре должно быть 10 игроков, передано %', v.total using errcode = '22023';
  end if;
  if (v.citizens, v.sheriffs, v.mafia, v.dons) <> (6, 1, 2, 1) then
    raise exception 'Неверный набор ролей: мирных %, шерифов %, мафии %, донов % (нужно 6/1/2/1)',
      v.citizens, v.sheriffs, v.mafia, v.dons using errcode = '22023';
  end if;
  if v.wrong_results > 0 then
    raise exception 'Результаты игроков не совпадают с победителем (%)', p_winner using errcode = '22023';
  end if;
  if v.wrong_totals > 0 then
    raise exception 'Итоговый балл не равен сумме базового и дополнительного' using errcode = '22023';
  end if;
end;
$$;

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

  -- Состав проверяется и здесь, а не только в форме: база не должна принять
  -- игру, которую форма не дала бы сохранить
  perform check_game_lineup(p_game->>'winner', p_players);

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
