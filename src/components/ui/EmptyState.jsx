export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-elev-2 border border-line flex items-center justify-center mb-5">
          <Icon size={28} className="text-stone-600" />
        </div>
      )}
      <h3 className="text-lg font-medium text-stone-200 mb-1">{title}</h3>
      {description && <p className="text-stone-500 mb-5 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
