export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
