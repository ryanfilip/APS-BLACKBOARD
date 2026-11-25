export const STATUS_LABELS = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
};

const STATUS_STYLES = {
  OPEN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
};

export default function StatusBadge({ status, className = '' }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      } ${className}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
