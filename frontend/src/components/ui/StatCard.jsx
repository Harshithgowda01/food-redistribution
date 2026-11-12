export default function StatCard({ label, value, hint, icon: Icon, accent = 'text-forest' }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon && (
          <span className="w-8 h-8 rounded-lg bg-forest-light text-forest flex items-center justify-center shrink-0">
            <Icon size={16} />
          </span>
        )}
      </div>
      <p className={`text-2xl font-semibold text-ink mt-2 tracking-tight ${accent}`}>{value}</p>
      {hint && <p className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  );
}
