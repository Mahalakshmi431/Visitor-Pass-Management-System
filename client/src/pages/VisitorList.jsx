import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
  getVisitorsApi,
  approveVisitorApi,
  rejectVisitorApi,
  checkInVisitorApi,
  checkOutVisitorApi,
  cancelVisitorApi,
  bulkOperationApi,
} from "../services/visitorService";
import { exportToPDF, exportToExcel } from "../utils/exportUtils";
import SearchBar from "../components/SearchBar";
import ConfirmModal from "../components/ConfirmModal";
import Loader from "../components/Loader";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 10;

function VisitorList() {
  const { isAdmin, isReceptionist, isEmployee } = useAuth();

  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const debounceRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    show: false,
    title: "",
    message: "",
    actionType: "",
    visitorId: null,
    confirmText: "Confirm",
    confirmVariant: "primary",
    requireRemarks: false,
  });

  const [actionLoading, setActionLoading] = useState(false);

  const handleSearchInput = useCallback((value) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setCurrentPage(1);
    }, 350);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchVisitors = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getVisitorsApi({ search, status, visitDate });
        if (isMounted) setVisitors(data);
      } catch (err) {
        if (isMounted) setError(err.response?.data?.message || "Failed to fetch visitor records.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchVisitors();
    return () => { isMounted = false; };
  }, [search, status, visitDate]);

  useEffect(() => { setSelectedIds([]); }, [search, status, visitDate]);

  const refreshList = async () => {
    setLoading(true);
    try {
      const data = await getVisitorsApi({ search, status, visitDate });
      setVisitors(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch visitor records.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => { setSearchInput(""); setSearch(""); setStatus(""); setVisitDate(""); setCurrentPage(1); };

  const paginatedVisitors = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visitors.slice(start, start + PAGE_SIZE);
  }, [visitors, currentPage]);

  const totalPages = Math.ceil(visitors.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [visitors.length]);

  const computeSummary = () => ({
    total: visitors.length,
    pending: visitors.filter((v) => v.status === "PENDING").length,
    approved: visitors.filter((v) => v.status === "APPROVED").length,
    rejected: visitors.filter((v) => v.status === "REJECTED").length,
    checkedIn: visitors.filter((v) => v.status === "CHECKED_IN").length,
    checkedOut: visitors.filter((v) => v.status === "CHECKED_OUT").length,
  });

  const handleExportPDF = () => {
    const parts = ["visitor_list"];
    if (status) parts.push(status.toLowerCase());
    if (visitDate) parts.push(visitDate);
    exportToPDF(visitors, computeSummary(), parts.join("_"));
  };

  const handleExportExcel = () => {
    const parts = ["visitor_list"];
    if (status) parts.push(status.toLowerCase());
    if (visitDate) parts.push(visitDate);
    exportToExcel(visitors, computeSummary(), parts.join("_"));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const allVisibleIds = useMemo(() => paginatedVisitors.map((v) => v._id), [paginatedVisitors]);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : [...allVisibleIds]);
  };

  const selectedVisitors = useMemo(() => visitors.filter((v) => selectedIds.includes(v._id)), [visitors, selectedIds]);

  const canBulkApprove = isEmployee || isAdmin;
  const canBulkReject = isEmployee || isAdmin;
  const canBulkCheckIn = isReceptionist || isAdmin;
  const canBulkCheckOut = isReceptionist || isAdmin;

  const bulkActions = useMemo(() => {
    const actions = [];
    if (canBulkApprove) {
      const count = selectedVisitors.filter((v) => v.status === "PENDING").length;
      if (count > 0) actions.push({ label: `Approve (${count})`, action: "approve", variant: "success", count });
    }
    if (canBulkReject) {
      const count = selectedVisitors.filter((v) => v.status === "PENDING").length;
      if (count > 0) actions.push({ label: `Reject (${count})`, action: "reject", variant: "danger", count });
    }
    if (canBulkCheckIn) {
      const count = selectedVisitors.filter((v) => v.status === "APPROVED").length;
      if (count > 0) actions.push({ label: `Check In (${count})`, action: "checkin", variant: "primary", count });
    }
    if (canBulkCheckOut) {
      const count = selectedVisitors.filter((v) => v.status === "CHECKED_IN").length;
      if (count > 0) actions.push({ label: `Check Out (${count})`, action: "checkout", variant: "secondary", count });
    }
    return actions;
  }, [selectedVisitors, canBulkApprove, canBulkReject, canBulkCheckIn, canBulkCheckOut]);

  const handleBulkAction = async (action) => {
    const ids = selectedVisitors
      .filter((v) => {
        if (action === "approve" || action === "reject") return v.status === "PENDING";
        if (action === "checkin") return v.status === "APPROVED";
        if (action === "checkout") return v.status === "CHECKED_IN";
        return false;
      })
      .map((v) => v._id);

    if (ids.length === 0) return;

    setBulkLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await bulkOperationApi(action, ids);
      setSuccessMsg(result.message);
      setSelectedIds([]);
      refreshList();
    } catch (err) {
      setError(err.response?.data?.message || "Bulk operation failed.");
    } finally {
      setBulkLoading(false);
    }
  };

  const openActionModal = (type, visitor) => {
    if (type === "approve") {
      setModalConfig({ show: true, title: "Approve Visitor Request", message: `Approve visit pass ${visitor.passCode} for ${visitor.fullName}?`, actionType: "approve", visitorId: visitor._id, confirmText: "Approve Request", confirmVariant: "success", requireRemarks: false });
    } else if (type === "reject") {
      setModalConfig({ show: true, title: "Reject Visitor Request", message: `Reason for rejecting visit request from ${visitor.fullName}?`, actionType: "reject", visitorId: visitor._id, confirmText: "Reject Request", confirmVariant: "danger", requireRemarks: true });
    } else if (type === "checkIn") {
      setModalConfig({ show: true, title: "Check-In Visitor", message: `Check-in ${visitor.fullName} (${visitor.passCode}) now?`, actionType: "checkIn", visitorId: visitor._id, confirmText: "Confirm Check-In", confirmVariant: "primary", requireRemarks: false });
    } else if (type === "checkout") {
      setModalConfig({ show: true, title: "Check-Out Visitor", message: `Check-out ${visitor.fullName} (${visitor.passCode}) now?`, actionType: "checkout", visitorId: visitor._id, confirmText: "Confirm Check-Out", confirmVariant: "secondary", requireRemarks: false });
    } else if (type === "cancel") {
      setModalConfig({ show: true, title: "Cancel Visitor Pass", message: `Cancel visit pass ${visitor.passCode}?`, actionType: "cancel", visitorId: visitor._id, confirmText: "Cancel Pass", confirmVariant: "danger", requireRemarks: false });
    }
  };

  const handleConfirmAction = async (remarks) => {
    setActionLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const { actionType, visitorId } = modalConfig;
      if (actionType === "approve") { await approveVisitorApi(visitorId, remarks); setSuccessMsg("Visitor request approved successfully."); }
      else if (actionType === "reject") { await rejectVisitorApi(visitorId, remarks); setSuccessMsg("Visitor request rejected."); }
      else if (actionType === "checkIn") { await checkInVisitorApi(visitorId); setSuccessMsg("Visitor checked in successfully."); }
      else if (actionType === "checkout") { await checkOutVisitorApi(visitorId); setSuccessMsg("Visitor checked out successfully."); }
      else if (actionType === "cancel") { await cancelVisitorApi(visitorId); setSuccessMsg("Visitor pass cancelled."); }
      setModalConfig({ ...modalConfig, show: false });
      refreshList();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed.");
      setModalConfig({ ...modalConfig, show: false });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (statusVal) => {
    const map = {
      PENDING: <span className="badge bg-warning text-dark px-2 py-1">PENDING</span>,
      APPROVED: <span className="badge bg-success px-2 py-1">APPROVED</span>,
      CHECKED_IN: <span className="badge bg-primary px-2 py-1">CHECKED IN</span>,
      CHECKED_OUT: <span className="badge bg-secondary px-2 py-1">CHECKED OUT</span>,
      REJECTED: <span className="badge bg-danger px-2 py-1">REJECTED</span>,
      CANCELLED: <span className="badge bg-dark px-2 py-1">CANCELLED</span>,
    };
    return map[statusVal] || <span className="badge bg-secondary px-2 py-1">{statusVal}</span>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Visitor Records</h2>
          <p className="text-muted mb-0">Search, track status, and manage visitor requests.</p>
        </div>
        <div className="d-flex gap-2">
          <div className="btn-group shadow-sm">
            <button onClick={handleExportPDF} className="btn btn-danger px-3 fw-semibold" disabled={visitors.length === 0} title="Export as PDF">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className="me-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              PDF
            </button>
            <button onClick={handleExportExcel} className="btn btn-success px-3 fw-semibold" disabled={visitors.length === 0} title="Export as Excel">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className="me-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Excel
            </button>
          </div>
          {(isReceptionist || isAdmin) && (
            <Link to="/visitors/new" className="btn btn-primary px-4 fw-semibold shadow-sm">+ Register New Visitor</Link>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger alert-dismissible fade show mb-3"><strong>Error:</strong> {error}</div>}
      {successMsg && <div className="alert alert-success alert-dismissible fade show mb-3">{successMsg}</div>}

      <SearchBar search={searchInput} onSearchChange={handleSearchInput} status={status} onStatusChange={(v) => { setStatus(v); setCurrentPage(1); }} visitDate={visitDate} onDateChange={(v) => { setVisitDate(v); setCurrentPage(1); }} onClear={handleClearFilters} />

      {selectedIds.length > 0 && (
        <div className="card border-0 shadow-sm mb-3" style={{ borderLeft: "4px solid #2563eb" }}>
          <div className="card-body py-2 px-3 d-flex align-items-center gap-3 flex-wrap">
            <span className="fw-bold text-dark small">
              {selectedIds.length} selected
            </span>
            <div className="d-flex gap-2 flex-wrap">
              {bulkActions.map((ba) => (
                <button
                  key={ba.action}
                  className={`btn btn-${ba.variant} btn-sm fw-semibold`}
                  disabled={bulkLoading}
                  onClick={() => handleBulkAction(ba.action)}
                >
                  {bulkLoading ? "Processing..." : ba.label}
                </button>
              ))}
            </div>
            <button className="btn btn-link btn-sm text-muted ms-auto" onClick={() => setSelectedIds([])}>
              Clear selection
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Loader message="Fetching visitor records..." />
      ) : visitors.length === 0 ? (
        <div className="card shadow-sm border-0 p-5 text-center bg-white">
          <div className="fs-1 text-muted mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="52" height="52">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h5 className="fw-bold text-dark">No Visitor Records Found</h5>
          <p className="text-muted small">No records match your search filters.</p>
        </div>
      ) : (
        <>
          <div className="card shadow-sm border-0 bg-white overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: "40px" }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        title="Select all on this page"
                      />
                    </th>
                    <th>Pass Code</th>
                    <th>Visitor Name</th>
                    <th>Contact Info</th>
                    <th>Host Employee</th>
                    <th>Visit Schedule</th>
                    <th>Status</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVisitors.map((item) => (
                    <tr key={item._id} className={selectedIds.includes(item._id) ? "table-active" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.includes(item._id)}
                          onChange={() => toggleSelect(item._id)}
                        />
                      </td>
                      <td>
                        <Link to={`/visitors/${item._id}`} className="fw-bold text-decoration-none text-primary">
                          {item.passCode}
                        </Link>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{item.fullName}</div>
                        <div className="small text-muted">{item.company}</div>
                      </td>
                      <td>
                        <div className="small">{item.email}</div>
                        <div className="small text-muted">{item.phone}</div>
                      </td>
                      <td>
                        <div className="fw-semibold">{item.employeeName || item.employee?.name}</div>
                        <div className="small text-muted">{item.employee?.department}</div>
                      </td>
                      <td>
                        <div className="fw-medium">{item.visitDate}</div>
                        <div className="small text-muted">{item.expectedTime}</div>
                      </td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-2">
                          {(isEmployee || isAdmin) && item.status === "PENDING" && (
                            <>
                              <button onClick={() => openActionModal("approve", item)} className="btn btn-success btn-sm fw-semibold">Approve</button>
                              <button onClick={() => openActionModal("reject", item)} className="btn btn-outline-danger btn-sm">Reject</button>
                            </>
                          )}
                          {(isReceptionist || isAdmin) && item.status === "APPROVED" && (
                            <button onClick={() => openActionModal("checkIn", item)} className="btn btn-primary btn-sm fw-semibold">Check In</button>
                          )}
                          {(isReceptionist || isAdmin) && item.status === "CHECKED_IN" && (
                            <button onClick={() => openActionModal("checkout", item)} className="btn btn-secondary btn-sm fw-semibold">Check Out</button>
                          )}
                          {(isReceptionist || isAdmin) && (item.status === "PENDING" || item.status === "APPROVED") && (
                            <button onClick={() => openActionModal("cancel", item)} className="btn btn-outline-dark btn-sm" title="Cancel Visit Pass">Cancel</button>
                          )}
                          {(isReceptionist || isAdmin) && (item.status === "PENDING" || item.status === "APPROVED") && (
                            <Link to={`/visitors/${item._id}/edit`} className="btn btn-outline-secondary btn-sm">Edit</Link>
                          )}
                          <Link to={`/visitors/${item._id}`} className="btn btn-light btn-sm border">View Pass</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      <ConfirmModal
        show={modalConfig.show}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        confirmVariant={modalConfig.confirmVariant}
        requireRemarks={modalConfig.requireRemarks}
        onConfirm={handleConfirmAction}
        onCancel={() => setModalConfig({ ...modalConfig, show: false })}
        loading={actionLoading}
      />
    </div>
  );
}

export default VisitorList;
