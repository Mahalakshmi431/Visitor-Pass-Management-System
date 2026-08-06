import { useState, useEffect } from "react";
import { getVisitorReportApi } from "../services/reportService";
import Loader from "../components/Loader";

function Reports() {
  const [range, setRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");

  const [data, setData] = useState({ summary: {}, visitors: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await getVisitorReportApi({ range, startDate, endDate, status });
        if (isMounted) {
          setData(res);
        }
      } catch (err) {
        console.error("Error fetching report:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      isMounted = false;
    };
  }, [range, startDate, endDate, status]);

  const handlePrint = () => {
    window.print();
  };

  const { summary, visitors } = data;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
        <div>
          <h2 className="fw-bold mb-1">Visitor Reports & Analytics</h2>
          <p className="text-muted mb-0">Generate summary reports and statistics with date range filters.</p>
        </div>

        <button onClick={handlePrint} className="btn btn-dark px-4 fw-semibold shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="me-2" aria-hidden="true">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print / Save Report
        </button>
      </div>

      <div className="card shadow-sm border-0 p-3 mb-4 bg-light d-print-none">
        <div className="row g-2 align-items-center">
          <div className="col-md-3">
            <label className="form-label small fw-semibold text-muted">Date Filter</label>
            <select className="form-select" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="today">Today's Visits</option>
              <option value="week">This Week</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {range === "custom" && (
            <>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label small fw-semibold text-muted">End Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="col-md-3">
            <label className="form-label small fw-semibold text-muted">Status Filter</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="CHECKED_IN">CHECKED IN</option>
              <option value="CHECKED_OUT">CHECKED OUT</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-2">
          <div className="card shadow-sm border-0 p-3 bg-white text-center">
            <div className="text-muted small fw-bold">TOTAL</div>
            <div className="fs-3 fw-bold text-dark">{summary.total || 0}</div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm border-0 p-3 bg-white text-center">
            <div className="text-warning small fw-bold">PENDING</div>
            <div className="fs-3 fw-bold text-warning">{summary.pending || 0}</div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm border-0 p-3 bg-white text-center">
            <div className="text-success small fw-bold">APPROVED</div>
            <div className="fs-3 fw-bold text-success">{summary.approved || 0}</div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm border-0 p-3 bg-white text-center">
            <div className="text-primary small fw-bold">CHECKED IN</div>
            <div className="fs-3 fw-bold text-primary">{summary.checkedIn || 0}</div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm border-0 p-3 bg-white text-center">
            <div className="text-secondary small fw-bold">CHECKED OUT</div>
            <div className="fs-3 fw-bold text-secondary">{summary.checkedOut || 0}</div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm border-0 p-3 bg-white text-center">
            <div className="text-danger small fw-bold">REJECTED</div>
            <div className="fs-3 fw-bold text-danger">{summary.rejected || 0}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader message="Generating visitor statistics report..." />
      ) : (
        <div className="card shadow-sm border-0 bg-white overflow-hidden">
          <div className="card-header bg-dark text-white fw-bold py-3">
            Summary Log Details — Range: {range.toUpperCase()}
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Pass Code</th>
                  <th>Visitor Name</th>
                  <th>Contact / Company</th>
                  <th>Host Employee</th>
                  <th>Visit Date</th>
                  <th>Status</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                </tr>
              </thead>
              <tbody>
                {visitors.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No visitor records found for selected date range.
                    </td>
                  </tr>
                ) : (
                  visitors.map((v) => (
                    <tr key={v._id}>
                      <td className="fw-bold">{v.passCode}</td>
                      <td>{v.fullName}</td>
                      <td className="small text-muted">{v.email} ({v.company})</td>
                      <td className="fw-semibold">{v.employeeName || v.employee?.name}</td>
                      <td>{v.visitDate}</td>
                      <td>
                        <span className={`badge ${v.status === "CHECKED_IN" ? "bg-primary" : v.status === "APPROVED" ? "bg-success" : v.status === "CHECKED_OUT" ? "bg-secondary" : v.status === "REJECTED" ? "bg-danger" : "bg-warning text-dark"}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="small">{v.checkInTime ? new Date(v.checkInTime).toLocaleTimeString() : "-"}</td>
                      <td className="small">{v.checkOutTime ? new Date(v.checkOutTime).toLocaleTimeString() : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
