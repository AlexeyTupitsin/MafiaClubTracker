export function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-zinc-400">{label}</span>
        {Icon && <Icon size={18} className="text-violet-400" />}
      </div>
      <div className="text-2xl font-bold text-zinc-50">{value}</div>
    </div>
  );
}
