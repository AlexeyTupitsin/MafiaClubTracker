export function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        {Icon && <Icon size={18} className="text-indigo-400/70" />}
      </div>
      <div className="text-2xl font-bold font-data gradient-text">{value}</div>
    </div>
  );
}
