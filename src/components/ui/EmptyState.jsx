export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center mb-5">
          <Icon size={28} className="text-indigo-600/40" />
        </div>
      )}
      <h3 className="text-lg font-medium text-slate-200 mb-1">{title}</h3>
      {description && <p className="text-slate-500 mb-5 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
