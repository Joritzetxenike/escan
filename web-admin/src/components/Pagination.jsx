export default function Pagination({ page, pageSize, total, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="pagination">
      <span>
        Página {safePage} de {totalPages} · {total} ubicaciones
      </span>
      <div className="pagination-actions">
        <button
          className="button button-secondary button-small"
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPage(safePage - 1)}
        >
          Anterior
        </button>
        <button
          className="button button-secondary button-small"
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPage(safePage + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
