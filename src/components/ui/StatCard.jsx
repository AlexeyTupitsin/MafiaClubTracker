export function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs text-stone-400">{label}</span>
        {Icon && <Icon size={16} className="text-stone-500" aria-hidden="true" />}
      </div>
      <div className="font-display text-2xl font-bold font-data text-stone-50">{value}</div>
    </div>
  );
}

// Полоса показателей: одна карточка, ячейки через тонкие разделители.
// items: [{ label, value, hint? }]
// Полные ряды при любом числе ячеек (пустые ячейки показали бы фон-разделитель)
const STRIP_COLS = {
  3: "grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-5 [&>*:first-child]:col-span-2 md:[&>*:first-child]:col-span-1",
  6: "grid-cols-3 md:grid-cols-6",
};

export function StatStrip({ items, className = "" }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <dl className={`grid gap-px bg-line ${STRIP_COLS[items.length] ?? "grid-cols-3"}`}>
        {items.map((it) => (
          <div key={it.label} className="bg-elev-1 px-4 py-3.5 min-w-0">
            <dt className="text-xs text-stone-500 truncate">{it.label}</dt>
            <dd className="mt-1 font-data text-xl font-semibold text-stone-50 truncate">{it.value}</dd>
            {it.hint && <dd className="text-xs text-stone-500 font-data truncate">{it.hint}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}
