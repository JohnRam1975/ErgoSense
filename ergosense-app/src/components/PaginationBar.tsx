/** Controles de paginação client-side (listagens longas). */
export function PaginationBar({
  page,
  totalPages,
  total,
  start,
  end,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total <= 0 || totalPages <= 1) return null;
  return (
    <div className="pagination-bar" role="navigation" aria-label="Paginação">
      <span className="pagination-meta">
        {start}–{end} de {total}
      </span>
      <div className="pagination-actions">
        <button
          type="button"
          className="btn bs btn-sm btn-inline"
          disabled={!hasPrev}
          onClick={onPrev}
          aria-label="Página anterior"
        >
          ← Anterior
        </button>
        <span className="pagination-page">
          {page}/{totalPages}
        </span>
        <button
          type="button"
          className="btn bs btn-sm btn-inline"
          disabled={!hasNext}
          onClick={onNext}
          aria-label="Próxima página"
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}
