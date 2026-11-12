import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, actionTo }) {
  return (
    <div className="card px-6 py-12 text-center">
      <span className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-forest-light text-forest mb-3">
        <Icon size={22} />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="text-sm text-muted mt-1 max-w-md mx-auto">{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-5">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
