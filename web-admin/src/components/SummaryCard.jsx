import { STATUSES, formatPercent } from '../lib/estados';

export default function SummaryCard({ title, data }) {
  return (
    <section className="summary-card">
      <div className="summary-card-header">
        <h2>{title}</h2>
        <span>{data.total}</span>
      </div>
      <div className="summary-rows">
        {STATUSES.map((status) => {
          const item = data.desglose[status];
          return (
            <div className="summary-row" key={status}>
              <div className="summary-row-label">
                <span>{status}</span>
                <strong>{item.cantidad}</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-value"
                  style={{ width: `${item.porcentaje}%` }}
                />
              </div>
              <span className="summary-percentage">
                {formatPercent(item.porcentaje)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
