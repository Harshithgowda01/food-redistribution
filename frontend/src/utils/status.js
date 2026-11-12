export const STATUS_STYLES = {
  POSTED: 'bg-sky-50 text-sky-800 border-sky-200',
  MATCHING: 'bg-sky-50 text-sky-800 border-sky-200',
  WAITING_FOR_NGO: 'bg-amber-50 text-amber-800 border-amber-200',
  NGO_ACCEPTED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  NGO_COLLECTING: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  VOLUNTEER_REQUESTED: 'bg-violet-50 text-violet-800 border-violet-200',
  VOLUNTEER_ASSIGNED: 'bg-violet-50 text-violet-800 border-violet-200',
  FOOD_COLLECTED: 'bg-teal-50 text-teal-800 border-teal-200',
  OUT_FOR_DELIVERY: 'bg-teal-50 text-teal-800 border-teal-200',
  IN_TRANSIT: 'bg-teal-50 text-teal-800 border-teal-200',
  PICKED_UP: 'bg-teal-50 text-teal-800 border-teal-200',
  DELIVERED: 'bg-forest-light text-forest-dark border-forest-muted',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-800 border-rose-200',
  EXPIRED: 'bg-rose-50 text-rose-800 border-rose-200',
  UNMATCHED: 'bg-rose-50 text-rose-800 border-rose-200',
};

export function formatStatus(status) {
  if (!status) return '';
  return String(status).replace(/_/g, ' ');
}

export function statusClass(status) {
  return STATUS_STYLES[status] || 'bg-slate-50 text-slate-700 border-slate-200';
}
