function SearchBar({ search, onSearchChange, status, onStatusChange, visitDate, onDateChange, onClear }) {
  return (
    <div className="card shadow-sm border-0 p-3 mb-4 bg-light">
      <div className="row g-2 align-items-center">
        <div className="col-md-5">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">🔍</span>
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
