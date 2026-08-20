import { useState, useEffect, useCallback } from "react";
import { getVisitorReportApi, getAnalyticsApi, getFilterOptionsApi } from "../services/reportService";
import { exportToPDF, exportToExcel, exportToCSV } from "../utils/exportUtils";
import { StatusDonut, DailyTrend, TopCompanies, HourlyDistribution, TopHosts, PurposeBreakdown } from "../components/DashboardCharts";
import Loader from "../components/Loader";

const RANGE_LABELS = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  last30days: "Last 30 Days",
  custom: "Custom Range",
};

function Reports() {
  const [range, setRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [purpose, setPurpose] = useState("");

  const [filterOptions, setFilterOptions] = useState({ companies: [], hosts: [], purposes: [] });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [data, setData] = useState({ summary: {}, visitors: [] });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    getFilterOptionsApi().then(setFilterOptions).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { range, startDate, endDate, status, search, company, employeeName, purpose };
      const [reportRes, analyticsRes] = await Promise.all([
        getVisitorReportApi(params),
        getAnalyticsApi({ range, startDate, endDate }),
      ]);
      setData(reportRes);
      setAnalytics(analyticsRes);
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  }, [range, startDate, endDate, status, search, company, employeeName, purpose]);

  useEffect(() => {
    const timer = setTimeout(fetchData, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchData, search]);

  useEffect(() => {
    setSelectedIds([]);
  }, [range, startDate, endDate, status, company, employeeName, purpose]);

  const clearFilters = () => {
    setRange("today");
    setStartDate("");
    setEndDate("");
    setStatus("");
    setSearch("");
    setCompany("");
    setEmployeeName("");
    setPurpose("");
  };

  const hasActiveFilters = status || search || company || employeeName || purpose || range !== "today";

  const { summary, visitors } = data;

  const selectedVisitors = visitors.filter((v) => selectedIds.includes(v._id));
  const allVisibleIds = visitors.map((v) => v._id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : [...allVisibleIds]);
  };
  const hasSelection = selectedIds.length > 0;

  const rangeLabel = range === "custom" && startDate
    ? `${startDate} to ${endDate || "..."}`
    : RANGE_LABELS[range] || "All Time";

  const getFileName = () => {
    const parts = ["visitor_report"];
    if (range) parts.push(range);
    if (status) parts.push(status.toLowerCase());
    if (company) parts.push(company.replace(/[^a-zA-Z0-9]/g, "_"));
    if (startDate) parts.push(startDate);
    return parts.join("_");
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
        <div>
          <h2 className="fw-bold mb-1">Visitor Reports & Analytics</h2>
          <p className="text-muted mb-0">Interactive charts, summary statistics, and exportable reports.</p>
        </div>
        <div className="dropdown">
          <button className="btn btn-dark px-4 fw-semibold shadow-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-auto-close="true" disabled={visitors.length === 0}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="me-1" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Report
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow">
            <li className="px-3 py-1"><small className="text-muted fw-bold">ALL {visitors.length} RECORDS</small></li>
            <li>
              <button className="dropdown-item d-flex align-items-center gap-2 py-2" onClick={() => exportToPDF(visitors, summary, getFileName(), rangeLabel)}>
                <span className="badge bg-danger">PDF</span>
                <span>Download as PDF</span>
              </button>
            </li>
            <li>
              <button className="dropdown-item d-flex align-items-center gap-2 py-2" onClick={() => exportToExcel(visitors, summary, getFileName(), rangeLabel)}>
                <span className="badge bg-success">XLS</span>
                <span>Download as Excel</span>
              </button>
            </li>
            <li>
              <button className="dropdown-item d-flex align-items-center gap-2 py-2" onClick={() => exportToCSV(visitors, summary, getFileName())}>
                <span className="badge bg-primary">CSV</span>
                <span>Download as CSV</span>
              </button>
            </li>
            {hasSelection && (
              <>
                <li><hr className="dropdown-divider" /></li>
                <li className="px-3 py-1"><small className="text-muted fw-bold">{selectedIds.length} SELECTED</small></li>
                <li>
                  <button className="dropdown-item d-flex align-items-center gap-2 py-2" onClick={() => exportToPDF(selectedVisitors, summary, getFileName() + "_selected", rangeLabel)}>
                    <span className="badge bg-danger">PDF</span>
                    <span>Export selected as PDF</span>
                  </button>
                </li>
                <li>
                  <button className="dropdown-item d-flex align-items-center gap-2 py-2" onClick={() => exportToExcel(selectedVisitors, summary, getFileName() + "_selected", rangeLabel)}>
                    <span className="badge bg-success">XLS</span>
                    <span>Export selected as Excel</span>
                  </button>
                </li>
                <li>
                  <button className="dropdown-item d-flex align-items-center gap-2 py-2" onClick={() => exportToCSV(selectedVisitors, summary, getFileName() + "_selected")}>
                    <span className="badge bg-primary">CSV</span>
                    <span>Export selected as CSV</span>
                  </button>
                </li>
              </>
            )}
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button className="dropdown-item d-flex align-items-center gap-2 py-2" onClick={() => window.print()}>
                <span className="badge bg-dark">PRINT</span>
                <span>Print / Save via Browser</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Primary Filters */}
      <div className="card shadow-sm border-0 p-3 mb-3 bg-light d-print-none">
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label small fw-semibold text-muted">Date Range</label>
            <select className="form-select" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="last30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {range === "custom" && (
            <>
              <div className="col-md-2">
                <label className="form-label small fw-semibold text-muted">Start Date</label>
                <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-semibold text-muted">End Date</label>
                <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}
          <div className={range === "custom" ? "col-md-2" : "col-md-3"}>
            <label className="form-label small fw-semibold text-muted">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold text-muted">Search</label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Name, email, company, pass code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="d-print-none mb-3">
        <button
          className="btn btn-sm btn-outline-secondary fw-semibold"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? "Hide" : "Show"} Advanced Filters
          {hasActiveFilters && !showAdvanced && <span className="badge bg-primary ms-2">Active</span>}
        </button>
        {hasActiveFilters && (
          <button className="btn btn-sm btn-outline-danger ms-2 fw-semibold" onClick={clearFilters}>
            Clear All Filters
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="card shadow-sm border-0 p-3 mb-4 d-print-none" style={{ borderLeft: "3px solid #2563eb" }}>
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-muted">Company</label>
              <select className="form-select" value={company} onChange={(e) => setCompany(e.target.value)}>
                <option value="">All Companies</option>
                {filterOptions.companies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-muted">Host Employee</label>
              <select className="form-select" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)}>
                <option value="">All Hosts</option>
                {filterOptions.hosts.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-muted">Purpose</label>
              <select className="form-select" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                <option value="">All Purposes</option>
                {filterOptions.purposes.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: "TOTAL", value: summary.total, cls: "text-dark", bg: "bg-dark" },
          { label: "PENDING", value: summary.pending, cls: "text-warning", bg: "bg-warning" },
          { label: "APPROVED", value: summary.approved, cls: "text-success", bg: "bg-success" },
          { label: "CHECKED IN", value: summary.checkedIn, cls: "text-primary", bg: "bg-primary" },
          { label: "CHECKED OUT", value: summary.checkedOut, cls: "text-secondary", bg: "bg-secondary" },
          { label: "REJECTED", value: summary.rejected, cls: "text-danger", bg: "bg-danger" },
        ].map((c) => (
          <div key={c.label} className="col-md-2 col-4">
            <div className="card shadow-sm border-0 p-3 bg-white text-center h-100">
              <div className={`small fw-bold ${c.cls}`}>{c.label}</div>
              <div className={`fs-3 fw-bold ${c.cls}`}>{c.value || 0}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <Loader message="Generating visitor statistics report..." />
      ) : (
        <>
          {/* Charts Section */}
          {analytics && analytics.totalVisitors > 0 && (
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Visual Analytics</h5>
                <span className="badge bg-light text-dark border fw-normal">{rangeLabel}</span>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-lg-4">
                  <StatusDonut data={analytics.statusDistribution} />
                </div>
                <div className="col-lg-8">
                  <DailyTrend data={analytics.dailyTrend} />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-lg-4">
                  <TopCompanies data={analytics.topCompanies} />
                </div>
                <div className="col-lg-4">
                  <TopHosts data={analytics.topHosts} />
                </div>
                <div className="col-lg-4">
                  <HourlyDistribution data={analytics.hourlyDistribution} />
                </div>
              </div>
              <div className="row g-3">
                <div className="col-lg-12">
                  <PurposeBreakdown data={analytics.purposeBreakdown} />
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="card shadow-sm border-0 bg-white overflow-hidden d-print-block">
            <div className="card-header bg-dark text-white fw-bold py-3 d-flex justify-content-between">
              <span>Visitor Records — {rangeLabel}</span>
              <span className="fw-normal opacity-75">{visitors.length} record{visitors.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "40px" }}>
                      <input type="checkbox" className="form-check-input" checked={allSelected} onChange={toggleSelectAll} title="Select all" />
                    </th>
                    <th>Pass Code</th>
                    <th>Visitor Name</th>
                    <th>Contact / Company</th>
                    <th>Host Employee</th>
                    <th>Visit Date</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-4 text-muted">No visitor records found for selected filters.</td>
                    </tr>
                  ) : (
                    visitors.map((v) => (
                      <tr key={v._id} className={selectedIds.includes(v._id) ? "table-active" : ""}>
                        <td>
                          <input type="checkbox" className="form-check-input" checked={selectedIds.includes(v._id)} onChange={() => toggleSelect(v._id)} />
                        </td>
                        <td className="fw-bold">{v.passCode}</td>
                        <td>{v.fullName}</td>
                        <td className="small text-muted">
                          {v.email}
                          {v.company && v.company !== "Independent / N/A" && <><br /><span className="text-dark fw-semibold">{v.company}</span></>}
                        </td>
                        <td className="fw-semibold">{v.employeeName || v.employee?.name}</td>
                        <td>{v.visitDate}</td>
                        <td className="small">{v.purpose || "-"}</td>
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
        </>
      )}
    </div>
  );
}

export default Reports;
