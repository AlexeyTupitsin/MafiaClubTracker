-- =====================================================================
-- Iron Maf — инициализация базы данных
-- =====================================================================
-- Запустить ЦЕЛИКОМ в Supabase → SQL Editor на новом (пустом) проекте.
-- Создаёт все таблицы, ограничения, RLS-политики, функцию is_admin()
-- и storage-бакет для аватаров. Достаточно одного запуска.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Таблицы
-- ---------------------------------------------------------------------

-- Профили пользователей. id совпадает с id пользователя из auth.users.
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  login        text not null unique,
  display_name text,
  role         text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at   timestamptz not null default now()
);

-- Сезоны
create table seasons (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  start_date             date not null,
  end_date               date,
  is_active              boolean not null default false,
  created_at             timestamptz not null default now(),
  track_first_kill       boolean not null default false,
  rating_threshold_type  text not null default 'none'
                           check (rating_threshold_type in ('none', 'absolute', 'percent')),
  rating_threshold_value integer not null default 0 check (rating_threshold_value >= 0),
  track_best_move        boolean default false
);

-- Игроки
create table players (
  id         uuid primary key default gen_random_uuid(),
  nickname   text not null unique,
  real_name  text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  avatar_url text,
  elo        numeric not null default 1000,
  elo_games  integer not null default 0
);

-- Турниры (привязаны к сезону)
create table tournaments (
  id         uuid primary key default gen_random_uuid(),
  season_id  uuid not null references seasons (id) on delete cascade,
  name       text not null,
  date       date not null,
  created_at timestamptz not null default now(),
  notes      text
);

-- Игры
create table games (
  id               uuid primary key default gen_random_uuid(),
  season_id        uuid not null references seasons (id) on delete restrict,
  game_number      integer not null,
  date             timestamptz not null default now(),
  winner           text not null check (winner in ('red', 'black', 'draw')),
  notes            text,
  created_by       uuid references auth.users (id) on delete no action,
  created_at       timestamptz not null default now(),
  tournament_id    uuid references tournaments (id) on delete set null,
  first_killed     uuid references players (id) on delete set null,
  best_move_seat_1 integer check (best_move_seat_1 between 1 and 10),
  best_move_seat_2 integer check (best_move_seat_2 between 1 and 10),
  best_move_seat_3 integer check (best_move_seat_3 between 1 and 10),
  unique (season_id, game_number)
);

-- Результаты игроков в каждой игре (10 мест на игру)
create table game_players (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games (id) on delete cascade,
  player_id     uuid not null references players (id) on delete restrict,
  seat          integer not null check (seat between 1 and 10),
  role          text not null check (role in ('citizen', 'mafia', 'sheriff', 'don')),
  result        text not null check (result in ('win', 'lose', 'draw')),
  base_score    numeric not null default 0,
  bonus_score   numeric not null default 0,
  bonus_comment text,
  total_score   numeric not null default 0,
  -- ELO: заполняется пересчётом из приложения (Настройки → Пересчитать ELO)
  elo_before    numeric,
  elo_expected  numeric,
  elo_k         integer,
  elo_delta     numeric,
  elo_after     numeric,
  unique (game_id, seat),
  unique (game_id, player_id)
);

create index game_players_elo_idx on game_players (player_id) where elo_after is not null;

-- ---------------------------------------------------------------------
-- Функция проверки роли админа (используется в RLS-политиках)
-- ---------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table profiles     enable row level security;
alter table seasons      enable row level security;
alter table players      enable row level security;
alter table tournaments  enable row level security;
alter table games        enable row level security;
alter table game_players enable row level security;

-- profiles: видеть свой профиль или (если админ) любой; обновлять только свой
create policy profiles_read_own   on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_update_own on profiles for update using (id = auth.uid());

-- В своём профиле можно менять только display_name — иначе пользователь
-- выставил бы себе role = 'admin'
revoke update on profiles from anon, authenticated;
grant update (display_name) on profiles to authenticated;

-- seasons / players / games / game_players / tournaments: читают все, пишет только админ
create policy seasons_read       on seasons      for select using (true);
create policy seasons_write      on seasons      for all    using (is_admin());

create policy players_read       on players      for select using (true);
create policy players_write      on players      for all    using (is_admin());

create policy games_read         on games        for select using (true);
create policy games_write        on games        for all    using (is_admin());

create policy game_players_read  on game_players for select using (true);
create policy game_players_write on game_players for all    using (is_admin());

create policy tournaments_read   on tournaments  for select using (true);
create policy tournaments_write  on tournaments  for all    using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- Storage: бакет аватаров игроков
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Аватары: публичное чтение, загрузка/изменение/удаление — только админ
create policy avatars_read   on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_insert on storage.objects for insert with check (bucket_id = 'avatars' and is_admin());
create policy avatars_update on storage.objects for update using (bucket_id = 'avatars' and is_admin());
create policy avatars_delete on storage.objects for delete using (bucket_id = 'avatars' and is_admin());

-- ---------------------------------------------------------------------
-- Атомарные операции записи (сохранение игры, пересчёт ELO, импорт)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Импорт данных из файла экспорта одной транзакцией
-- ---------------------------------------------------------------------
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

grant execute on function save_game(jsonb, jsonb) to authenticated;
grant execute on function apply_elo(jsonb, jsonb) to authenticated;
grant execute on function import_data(jsonb) to authenticated;
