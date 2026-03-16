export function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-zinc-800 text-zinc-300 border border-zinc-700",
    red: "bg-red-500/10 text-red-400 border border-red-500/20",
    black: "bg-zinc-800 text-zinc-200 border border-zinc-600",
    green: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    blue: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    purple: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
    active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    inactive: "bg-zinc-800 text-zinc-500 border border-zinc-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      styles[variant] || styles.default
    }`}>
      {children}
    </span>
  );
}
