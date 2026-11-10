import { LayoutDashboard, Trophy, Users, Settings, Sword, Award, Heart, Star, BowArrow, HatGlasses, Medal } from "lucide-react";

export const ROLE_NAMES = {
  citizen: "Мирный",
  sheriff: "Шериф",
  mafia: "Мафия",
  don: "Дон",
};

export const TEAM_NAMES = {
  red: "Красные",
  black: "Чёрные",
  draw: "Ничья",
};

export const RESULT_NAMES = {
  win: "Победа",
  lose: "Поражение",
  draw: "Ничья",
};

export const ROLE_REQUIRED = { citizen: 6, sheriff: 1, mafia: 2, don: 1 };

export const NOMINATION_CONFIG = [
  { role: "citizen", icon: Heart, label: "Лучший красный" },
  { role: "sheriff", icon: Star, label: "Лучший шериф" },
  { role: "mafia", icon: BowArrow, label: "Лучший чёрный" },
  { role: "don", icon: HatGlasses, label: "Лучший дон" },
];

export const MEDAL_ICON = Medal;

export const ROLE_OPTIONS = [
  { value: "citizen", label: "Мирный" },
  { value: "sheriff", label: "Шериф" },
  { value: "mafia", label: "Мафия" },
  { value: "don", label: "Дон" },
];

export const ROLE_BADGE_VARIANT = {
  citizen: "red",
  sheriff: "yellow",
  mafia: "black",
  don: "don",
};

export const ROLE_COLORS = {
  citizen: "#ef4444",
  sheriff: "#facc15",
  mafia: "#78716c",
  don: "#e7e5e4",
};

export const TABS = [
  { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
  { id: "rating", label: "Рейтинг", icon: Trophy },
  { id: "tournaments", label: "Турниры", icon: Award },
  { id: "games", label: "Игры", icon: Sword },
  { id: "players", label: "Игроки", icon: Users },
  { id: "settings", label: "Настройки", icon: Settings },
];

// ELO-рейтинг. Формула: docs/расчет эло.png, план: docs/plans/2026-09-01-elo-rating-plan.md
export const ELO_CONFIG = {
  start: 1000,          // рейтинг игрока до первой игры
  kNew: 40,             // k для игроков, сыгравших <= newPlayerGames рейтинговых игр
  kNormal: 20,          // k для всех остальных
  newPlayerGames: 30,
  meanBonus: 0.17,      // обычный доп. балл за игру (среднее по истории клуба), вычитается из S_A
};

// Tailwind-классы значка роли: красная команда — красный/жёлтый, чёрная — графит/белый
export const ROLE_TONE = {
  citizen: "text-red-400 bg-red-500/10 ring-red-500/25",
  sheriff: "text-yellow-300 bg-yellow-400/10 ring-yellow-400/25",
  mafia: "text-stone-300 bg-stone-700/40 ring-stone-500/30",
  don: "text-stone-50 bg-stone-950 ring-stone-300/50",
};
