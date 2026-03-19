export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={48} className="text-zinc-600 mb-4" />}
      <h3 className="text-lg font-medium text-zinc-300 mb-1">{title}</h3>
      {description && <p className="text-zinc-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
