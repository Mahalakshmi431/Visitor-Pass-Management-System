function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const delta = 2;
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    if (left > 1) {
      pages.push(1);
      if (left > 2) pages.push("...");
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages) {
      if (right < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav className="d-flex justify-content-between align-items-center mt-3" aria-label="Visitor list pagination">
      <small className="text-muted">
        Page {currentPage} of {totalPages}
      </small>
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            &laquo;
          </button>
        </li>
        {getVisiblePages().map((page, idx) =>
          page === "..." ? (
            <li key={`ellipsis-${idx}`} className="page-item disabled">
              <span className="page-link">...</span>
            </li>
          ) : (
            <li key={page} className={`page-item ${currentPage === page ? "active" : ""}`}>
              <button className="page-link" onClick={() => onPageChange(page)}>
                {page}
              </button>
            </li>
          )
        )}
        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            &raquo;
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default Pagination;
