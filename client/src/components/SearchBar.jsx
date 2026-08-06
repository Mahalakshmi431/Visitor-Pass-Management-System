function SearchBar({ search, onSearchChange, status, onStatusChange, visitDate, onDateChange, onClear }) {
  return (
    <div className="card shadow-sm border-0 p-3 mb-4 bg-light">
      <div className="row g-2 align-items-center">
        <div className="col-md-5">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search by Visitor Name, Pass Code, Phone, or Host Employee..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING (Awaiting Approval)</option>
            <option value="APPROVED">APPROVED (Ready for Check-In)</option>
            <option value="CHECKED_IN">CHECKED IN (Currently Inside)</option>
            <option value="CHECKED_OUT">CHECKED OUT (Completed)</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div className="col-md-3">
          <input
            type="date"
            className="form-control"
            value={visitDate}
            onChange={(e) => onDateChange(e.target.value)}
            title="Filter by Visit Date"
          />
        </div>

        <div className="col-md-1">
          <button
            onClick={onClear}
            className="btn btn-outline-secondary w-100"
            title="Clear all filters"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchBar;
