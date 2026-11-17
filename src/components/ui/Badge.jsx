// Роли: красная команда — красный (мирный) и жёлтый (шериф),
// чёрная — графит (мафия) и светлый на тёмном (дон).
export function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-stone-500/10 text-stone-300 border border-stone-500/20",
    red: "bg-red-500/12 text-red-300 border border-red-500/25",
    black: "bg-stone-800 text-stone-300 border border-stone-600/40",
    don: "bg-stone-950 text-stone-50 border border-stone-300/60",
    green: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    yellow: "bg-yellow-400/10 text-yellow-300 border border-yellow-400/25",
    accent: "bg-accent-400/10 text-accent-300 border border-accent-400/25",
    active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    inactive: "bg-stone-800/30 text-stone-500 border border-stone-700/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
      styles[variant] || styles.default
    }`}>
      {children}
    </span>
  );
}
