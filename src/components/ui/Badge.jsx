export function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-slate-500/10 text-slate-300 border border-slate-500/20",
    red: "bg-red-500/10 text-red-300 border border-red-500/20",
    black: "bg-slate-700/30 text-slate-200 border border-slate-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    yellow: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20",
    blue: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    purple: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    inactive: "bg-slate-800/30 text-slate-500 border border-slate-700/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm ${
      styles[variant] || styles.default
    }`}>
      {children}
    </span>
  );
}
