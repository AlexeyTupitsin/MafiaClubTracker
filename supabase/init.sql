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
  avatar_url text
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
  unique (game_id, seat),
  unique (game_id, player_id)
);

-- ---------------------------------------------------------------------
-- Функция проверки роли админа (используется в RLS-политиках)
-- ---------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
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

-- seasons / players / games / game_players: читают все, пишет только админ
create policy seasons_read       on seasons      for select using (true);
create policy seasons_write      on seasons      for all    using (is_admin());

create policy players_read       on players      for select using (true);
create policy players_write      on players      for all    using (is_admin());

create policy games_read         on games        for select using (true);
create policy games_write        on games        for all    using (is_admin());

create policy game_players_read  on game_players for select using (true);
create policy game_players_write on game_players for all    using (is_admin());

-- tournaments: открыты на чтение и запись всем аутентифицированным
create policy tournaments_select on tournaments for select using (true);
create policy tournaments_insert on tournaments for insert with check (true);
create policy tournaments_update on tournaments for update using (true);
create policy tournaments_delete on tournaments for delete using (true);

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
