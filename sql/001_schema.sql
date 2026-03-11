-- Профили пользователей (ведущие)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  login TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Сезоны
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Игроки
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL UNIQUE,
  real_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Игры
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  game_number INT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  winner TEXT NOT NULL CHECK (winner IN ('red', 'black')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, game_number)
);

-- Участники игры
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  seat INT NOT NULL CHECK (seat BETWEEN 1 AND 10),
  role TEXT NOT NULL CHECK (role IN ('citizen', 'mafia', 'sheriff', 'don')),
  result TEXT NOT NULL CHECK (result IN ('win', 'lose')),
  base_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  bonus_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  bonus_comment TEXT,
  total_score NUMERIC(4,1) NOT NULL DEFAULT 0,
  UNIQUE (game_id, seat),
  UNIQUE (game_id, player_id)
);
