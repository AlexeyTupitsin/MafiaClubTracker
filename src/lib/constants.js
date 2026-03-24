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
};

export const RESULT_NAMES = {
  win: "Победа",
  lose: "Поражение",
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
  mafia: "default",
  don: "purple",
};

export const ROLE_COLORS = {
  citizen: "#ef4444",
  sheriff: "#eab308",
  mafia: "#6b7280",
  don: "#8b5cf6",
};

export const TABS = [
  { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
  { id: "rating", label: "Рейтинг", icon: Trophy },
  { id: "tournaments", label: "Турниры", icon: Award },
  { id: "games", label: "Игры", icon: Sword },
  { id: "players", label: "Игроки", icon: Users },
  { id: "settings", label: "Настройки", icon: Settings },
];
