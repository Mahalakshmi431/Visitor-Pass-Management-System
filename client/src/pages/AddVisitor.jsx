import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import VisitorForm from "../components/VisitorForm";
import { createVisitorApi } from "../services/visitorService";

function AddVisitor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredVisitor, setRegisteredVisitor] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");

    try {
      const result = await createVisitorApi(formData);
      setRegisteredVisitor(result);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to register visitor.");
    } finally {
      setLoading(false);
    }
  };

  if (registeredVisitor) {
    return (
      <div className="container-fluid py-2">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 overflow-hidden">
              <div className="card-body p-0">
                <div className="bg-success text-white text-center py-4 px-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h3 className="fw-bold mb-1">Visitor Registered Successfully</h3>
                  <p className="mb-0 opacity-75">The visit request has been sent for approval.</p>
                </div>

                <div className="p-4">
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="bg-light rounded-3 p-3 text-center">
                        <div className="text-muted small fw-bold mb-1">PASS CODE</div>
                        <div className="fs-3 fw-bold text-primary font-monospace">{registeredVisitor.passCode}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="bg-light rounded-3 p-3 text-center">
                        <div className="text-muted small fw-bold mb-1">STATUS</div>
                        <div className="fs-3 fw-bold text-warning">PENDING</div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-3 p-3 mb-4">
                    <h6 className="fw-bold text-dark mb-3">Registration Details</h6>
                    <div className="row g-2">
                      <div className="col-sm-6">
                        <div className="text-muted small">Visitor Name</div>
                        <div className="fw-semibold">{registeredVisitor.fullName}</div>
                      </div>
                      <div className="col-sm-6">
                        <div className="text-muted small">Email</div>
                        <div className="fw-semibold">{registeredVisitor.email}</div>
                      </div>
                      <div className="col-sm-6">
                        <div className="text-muted small">Phone</div>
                        <div className="fw-semibold">{registeredVisitor.phone}</div>
                      </div>
                      <div className="col-sm-6">
                        <div className="text-muted small">Company</div>
                        <div className="fw-semibold">{registeredVisitor.company || "Independent"}</div>
                      </div>
                      <div className="col-sm-6">
                        <div className="text-muted small">Host Employee</div>
                        <div className="fw-semibold">{registeredVisitor.employeeName}</div>
                      </div>
                      <div className="col-sm-6">
                        <div className="text-muted small">Visit Date</div>
                        <div className="fw-semibold">{registeredVisitor.visitDate}</div>
                      </div>
                      <div className="col-sm-6">
                        <div className="text-muted small">Expected Time</div>
                        <div className="fw-semibold">{registeredVisitor.expectedTime}</div>
                      </div>
                      <div className="col-sm-6">
                        <div className="text-muted small">Purpose</div>
                        <div className="fw-semibold">{registeredVisitor.purpose}</div>
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-info small mb-0">
                    <strong>Next steps:</strong> The assigned employee will review and approve/reject this visit request.
                    You can track the status from the Visitor Records page.
                  </div>
                </div>

                <div className="d-flex justify-content-between px-4 pb-4">
                  <button onClick={() => setRegisteredVisitor(null)} className="btn btn-outline-primary px-4">
                    Register Another Visitor
                  </button>
                  <Link to="/visitors" className="btn btn-primary px-4">
                    View All Visitors
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-2">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <VisitorForm onSubmit={handleSubmit} loading={loading} error={error} />
        </div>
      </div>
    </div>
  );
}

export default AddVisitor;
