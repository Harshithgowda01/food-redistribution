import { formatStatus, statusClass } from '../../utils/status';

export default function StatusBadge({ status, className = '' }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusClass(status)} ${className}`}>
      {formatStatus(status)}
    </span>
  );
}
