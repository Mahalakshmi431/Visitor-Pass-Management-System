import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getVisitorByIdApi } from "../services/visitorService";
import Loader from "../components/Loader";

function VisitorDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const result = await getVisitorByIdApi(id);
        setData(result);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load visitor details.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return <Loader message="Loading visitor pass & activity trail..." />;

  if (error || !data) {
    return (
      <div className="alert alert-danger my-4">
        {error || "Visitor pass not found."}
      </div>
    );
  }

  const { visitor, activityLogs } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
        <Link to="/visitors" className="btn btn-outline-secondary">
          ← Back to Visitor List
        </Link>
        <button onClick={handlePrint} className="btn btn-primary px-4 fw-semibold shadow-sm">
          🖨️ Print Visitor Badge
        </button>
      </div>

      <div className="row g-4">
        {/* Printable Pass Badge */}
        <div className="col-lg-6">
          <div className="card shadow-lg border-2 border-primary rounded-4 overflow-hidden bg-white printable-pass">
            <div className="card-header bg-dark text-white text-center py-3">
              <div className="d-flex justify-content-between align-items-center px-2">
                <span className="fw-bold text-warning">OFFICIAL VISITOR PASS</span>
                <span className="badge bg-primary fs-6">{visitor.passCode}</span>
              </div>
            </div>

            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div className="display-6 fw-bold text-dark">{visitor.fullName}</div>
                <div className="text-muted fw-semibold">{visitor.company}</div>
                <span className={`badge mt-2 px-3 py-2 ${visitor.status === "CHECKED_IN" ? "bg-primary" : visitor.status === "APPROVED" ? "bg-success" : visitor.status === "CHECKED_OUT" ? "bg-secondary" : "bg-warning text-dark"}`}>
                  STATUS: {visitor.status}
                </span>
              </div>

              <hr />

              <div className="row g-3">
                <div className="col-6">
                  <div className="small text-muted text-uppercase fw-bold">Host Employee</div>
                  <div className="fw-bold text-dark">{visitor.employeeName || visitor.employee?.name}</div>
                  <div className="small text-muted">{visitor.employee?.department}</div>
                </div>

                <div className="col-6">
                  <div className="small text-muted text-uppercase fw-bold">Visit Date & Time</div>
                  <div className="fw-bold text-dark">{visitor.visitDate}</div>
                  <div className="small text-muted">Expected: {visitor.expectedTime}</div>
                </div>

                <div className="col-6">
                  <div className="small text-muted text-uppercase fw-bold">Contact Email</div>
                  <div className="small text-dark fw-medium">{visitor.email}</div>
                </div>

                <div className="col-6">
                  <div className="small text-muted text-uppercase fw-bold">Phone Number</div>
                  <div className="small text-dark fw-medium">{visitor.phone}</div>
                </div>

                <div className="col-12">
                  <div className="small text-muted text-uppercase fw-bold">Purpose of Visit</div>
                  <div className="p-2 bg-light rounded text-dark small mt-1">{visitor.purpose}</div>
                </div>

                {visitor.remarks && (
                  <div className="col-12">
                    <div className="small text-muted text-uppercase fw-bold">Employee Remarks</div>
                    <div className="p-2 bg-warning bg-opacity-10 text-dark rounded small mt-1">{visitor.remarks}</div>
                  </div>
                )}

                <div className="col-6">
                  <div className="small text-muted text-uppercase fw-bold">Check-In Time</div>
                  <div className="small fw-semibold text-success">
                    {visitor.checkInTime ? new Date(visitor.checkInTime).toLocaleString() : "Not Checked In Yet"}
                  </div>
                </div>

                <div className="col-6">
                  <div className="small text-muted text-uppercase fw-bold">Check-Out Time</div>
                  <div className="small fw-semibold text-secondary">
                    {visitor.checkOutTime ? new Date(visitor.checkOutTime).toLocaleString() : "Not Checked Out Yet"}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-top text-center text-muted small">
                Registered By: {visitor.createdByName || visitor.createdBy?.name || "System"}
              </div>
            </div>
          </div>
        </div>

        {/* Activity History Audit Trail */}
        <div className="col-lg-6 d-print-none">
          <div className="card shadow-sm border-0 p-4 bg-white">
            <h5 className="fw-bold mb-3">Activity History Audit Trail</h5>
            <p className="text-muted small mb-4">Complete timeline recording every action performed on this visitor pass.</p>

            {activityLogs.length === 0 ? (
              <div className="text-muted small">No activity logs recorded.</div>
            ) : (
              <div className="timeline">
                {activityLogs.map((log) => (
                  <div key={log._id} className="border-start border-3 border-primary ps-3 pb-3 mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className={`badge ${log.action === "APPROVED" ? "bg-success" : log.action === "REJECTED" ? "bg-danger" : log.action === "CHECKED_IN" ? "bg-primary" : "bg-secondary"}`}>
                        {log.action}
                      </span>
                      <span className="small text-muted">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="fw-semibold text-dark mt-1">By: {log.performedBy} ({log.performedByRole || "User"})</div>
                    {log.remarks && <div className="small text-muted mt-1">"{log.remarks}"</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VisitorDetails;
