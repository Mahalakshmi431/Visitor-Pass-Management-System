import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
  getVisitorsApi,
  approveVisitorApi,
  rejectVisitorApi,
  checkInVisitorApi,
  checkOutVisitorApi,
  cancelVisitorApi,
} from "../services/visitorService";
import SearchBar from "../components/SearchBar";
import ConfirmModal from "../components/ConfirmModal";
import Loader from "../components/Loader";

function VisitorList() {
  const { isAdmin, isReceptionist, isEmployee } = useAuth();

  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [visitDate, setVisitDate] = useState("");

  // Modal State
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

  useEffect(() => {
    let isMounted = true;
    const fetchVisitors = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getVisitorsApi({ search, status, visitDate });
        if (isMounted) {
          setVisitors(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to fetch visitor records.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchVisitors();

    return () => {
      isMounted = false;
    };
  }, [search, status, visitDate]);

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

  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setVisitDate("");
  };

  const openActionModal = (type, visitor) => {
    if (type === "approve") {
      setModalConfig({
        show: true,
        title: "Approve Visitor Request",
        message: `Are you sure you want to approve visit pass ${visitor.passCode} for ${visitor.fullName}?`,
        actionType: "approve",
        visitorId: visitor._id,
        confirmText: "Approve Request",
        confirmVariant: "success",
        requireRemarks: false,
      });
    } else if (type === "reject") {
      setModalConfig({
        show: true,
        title: "Reject Visitor Request",
        message: `Please provide a reason for rejecting the visit request from ${visitor.fullName}.`,
        actionType: "reject",
        visitorId: visitor._id,
        confirmText: "Reject Request",
        confirmVariant: "danger",
        requireRemarks: true,
      });
    } else if (type === "checkIn") {
      setModalConfig({
        show: true,
        title: "Check-In Visitor",
        message: `Check-in visitor ${visitor.fullName} (${visitor.passCode}) now?`,
        actionType: "checkIn",
        visitorId: visitor._id,
        confirmText: "Confirm Check-In",
        confirmVariant: "primary",
        requireRemarks: false,
      });
    } else if (type === "checkout") {
      setModalConfig({
        show: true,
        title: "Check-Out Visitor",
        message: `Check-out visitor ${visitor.fullName} (${visitor.passCode}) now?`,
        actionType: "checkout",
        visitorId: visitor._id,
        confirmText: "Confirm Check-Out",
        confirmVariant: "secondary",
        requireRemarks: false,
      });
    } else if (type === "cancel") {
      setModalConfig({
        show: true,
        title: "Cancel Visitor Pass",
        message: `Are you sure you want to cancel visit pass ${visitor.passCode}?`,
        actionType: "cancel",
        visitorId: visitor._id,
        confirmText: "Cancel Pass",
        confirmVariant: "danger",
        requireRemarks: false,
      });
    }
  };

  const handleConfirmAction = async (remarks) => {
    setActionLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const { actionType, visitorId } = modalConfig;

      if (actionType === "approve") {
        await approveVisitorApi(visitorId, remarks);
        setSuccessMsg("Visitor request approved successfully.");
      } else if (actionType === "reject") {
        await rejectVisitorApi(visitorId, remarks);
        setSuccessMsg("Visitor request rejected.");
      } else if (actionType === "checkIn") {
        await checkInVisitorApi(visitorId);
        setSuccessMsg("Visitor checked in successfully.");
      } else if (actionType === "checkout") {
        await checkOutVisitorApi(visitorId);
        setSuccessMsg("Visitor checked out successfully.");
      } else if (actionType === "cancel") {
        await cancelVisitorApi(visitorId);
        setSuccessMsg("Visitor pass cancelled.");
      }

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
    switch (statusVal) {
      case "PENDING":
        return <span className="badge bg-warning text-dark px-2 py-1">PENDING</span>;
      case "APPROVED":
        return <span className="badge bg-success px-2 py-1">APPROVED</span>;
      case "CHECKED_IN":
        return <span className="badge bg-primary px-2 py-1">CHECKED IN</span>;
      case "CHECKED_OUT":
        return <span className="badge bg-secondary px-2 py-1">CHECKED OUT</span>;
      case "REJECTED":
        return <span className="badge bg-danger px-2 py-1">REJECTED</span>;
      case "CANCELLED":
        return <span className="badge bg-dark px-2 py-1">CANCELLED</span>;
      default:
        return <span className="badge bg-secondary px-2 py-1">{statusVal}</span>;
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Visitor Records</h2>
          <p className="text-muted mb-0">Search, track status, and manage visitor requests.</p>
        </div>

        {(isReceptionist || isAdmin) && (
          <Link to="/visitors/new" className="btn btn-primary px-4 fw-semibold shadow-sm">
            + Register New Visitor
          </Link>
        )}
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
          {successMsg}
        </div>
      )}

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        visitDate={visitDate}
        onDateChange={setVisitDate}
        onClear={handleClearFilters}
      />

      {loading ? (
        <Loader message="Fetching visitor records..." />
      ) : visitors.length === 0 ? (
        <div className="card shadow-sm border-0 p-5 text-center bg-white">
          <div className="fs-1 text-muted mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="52" height="52" aria-hidden="true">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h5 className="fw-bold text-dark">No Visitor Records Found</h5>
          <p className="text-muted small">No records match your search filters.</p>
        </div>
      ) : (
        <div className="card shadow-sm border-0 bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-dark">
                <tr>
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
                {visitors.map((item) => (
                  <tr key={item._id}>
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
                            <button
                              onClick={() => openActionModal("approve", item)}
                              className="btn btn-success btn-sm fw-semibold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openActionModal("reject", item)}
                              className="btn btn-outline-danger btn-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {(isReceptionist || isAdmin) && item.status === "APPROVED" && (
                          <button
                            onClick={() => openActionModal("checkIn", item)}
                            className="btn btn-primary btn-sm fw-semibold"
                          >
                            Check In
                          </button>
                        )}

                        {(isReceptionist || isAdmin) && item.status === "CHECKED_IN" && (
                          <button
                            onClick={() => openActionModal("checkout", item)}
                            className="btn btn-secondary btn-sm fw-semibold"
                          >
                            Check Out
                          </button>
                        )}

                        {(isReceptionist || isAdmin) &&
                          (item.status === "PENDING" || item.status === "APPROVED") && (
                            <button
                              onClick={() => openActionModal("cancel", item)}
                              className="btn btn-outline-dark btn-sm"
                              title="Cancel Visit Pass"
                            >
                              Cancel
                            </button>
                          )}

                        {(isReceptionist || isAdmin) &&
                          (item.status === "PENDING" || item.status === "APPROVED") && (
                            <Link to={`/visitors/${item._id}/edit`} className="btn btn-outline-secondary btn-sm">
                              Edit
                            </Link>
                          )}

                        <Link to={`/visitors/${item._id}`} className="btn btn-light btn-sm border">
                          View Pass
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
