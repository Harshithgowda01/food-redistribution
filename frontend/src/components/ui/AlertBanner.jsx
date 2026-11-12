import { Link } from 'react-router-dom';

const tones = {
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  success: 'bg-forest-light border-forest-muted text-forest-dark',
  danger: 'bg-rose-50 border-rose-200 text-rose-900',
};

export default function AlertBanner({ tone = 'warning', title, children, actionLabel, actionTo, action }) {
  return (
    <div className={`border rounded-card px-4 py-3.5 mb-6 flex justify-between items-center flex-wrap gap-3 ${tones[tone]}`}>
      <div className="text-sm">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5 text-sm opacity-90' : ''}>{children}</div>
      </div>
      {actionTo && actionLabel && (
        <Link to={actionTo} className="btn-primary text-xs py-2 px-3">
          {actionLabel}
        </Link>
      )}
      {action}
    </div>
  );
}
