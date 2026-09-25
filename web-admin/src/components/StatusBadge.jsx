import { STATUS_COLORS } from '../lib/estados';

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#7f8c8d';

  return (
    <span
      className="status-badge"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span className="status-dot" style={{ backgroundColor: color }} />
      {status || 'Desconocido'}
    </span>
  );
}
