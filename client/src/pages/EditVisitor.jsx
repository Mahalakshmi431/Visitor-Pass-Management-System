import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVisitorByIdApi, updateVisitorApi } from "../services/visitorService";
import { getEmployeesApi } from "../services/authService";
import Loader from "../components/Loader";

const PURPOSE_PRESETS = [
  "Client Meeting",
  "Interview",
  "Delivery / Pickup",
  "Vendor / Contractor",
  "Training / Workshop",
  "Audit / Inspection",
  "Consultation",
  "Personal Visit",
];

function EditVisitor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [visitorStatus, setVisitorStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    govtIdType: "Aadhaar Card",
    govtIdNumber: "",
    employeeId: "",
    visitDate: "",
    expectedTime: "",
    purpose: "",
  });

  const isLocked = visitorStatus === "CHECKED_IN" || visitorStatus === "CHECKED_OUT";

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [empData, visitorRes] = await Promise.all([
          getEmployeesApi(),
          getVisitorByIdApi(id),
        ]);

        if (isMounted) {
          setEmployees(empData);
          const v = visitorRes.visitor;
          setVisitorStatus(v.status);

          setFormData({
            fullName: v.fullName || "",
            email: v.email || "",
            phone: v.phone || "",
            company: v.company || "",
            govtIdType: v.govtIdType || "Aadhaar Card",
            govtIdNumber: v.govtIdNumber || "",
            employeeId: v.employee?._id || v.employee || "",
            visitDate: v.visitDate || "",
            expectedTime: v.expectedTime || "",
            purpose: v.purpose || "",
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to load visitor pass data.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [id]);

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const validate = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = "Visitor name is required";
    else if (formData.fullName.trim().length < 2) errors.fullName = "Name must be at least 2 characters";

    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Enter a valid email address";

    if (!formData.phone.trim()) errors.phone = "Phone number is required";
    else if (formData.phone.replace(/[^0-9+]/g, "").length < 7) errors.phone = "Enter a valid phone number";

    if (!formData.employeeId) errors.employeeId = "Please select an employee to visit";

    if (!formData.visitDate) errors.visitDate = "Visit date is required";
    else if (formData.visitDate < getTodayStr()) errors.visitDate = "Visit date cannot be in the past";

    if (!formData.expectedTime) errors.expectedTime = "Arrival time is required";

    if (!formData.purpose.trim()) errors.purpose = "Purpose of visit is required";
    else if (formData.purpose.trim().length < 3) errors.purpose = "Purpose must be at least 3 characters";

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errors = validate();
    setFieldErrors((prev) => ({ ...prev, [name]: errors[name] || "" }));
  };

  const handlePurposeSelect = (purpose) => {
    setFormData((prev) => ({ ...prev, purpose }));
    setFieldErrors((prev) => ({ ...prev, purpose: "" }));
    setTouched((prev) => ({ ...prev, purpose: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) return;

    const errors = validate();
    setFieldErrors(errors);
    setTouched({
      fullName: true, email: true, phone: true, employeeId: true,
      visitDate: true, expectedTime: true, purpose: true,
    });
    if (Object.keys(errors).length > 0) return;

    setUpdating(true);
    setError("");
    try {
      await updateVisitorApi(id, formData);
      navigate(`/visitors/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update visitor pass.");
    } finally {
      setUpdating(false);
    }
  };

  const fieldClass = (name) =>
    `form-control ${isLocked ? "" : touched[name] && fieldErrors[name] ? "is-invalid" : touched[name] && !fieldErrors[name] ? "is-valid" : ""}`;

  const selectClass = (name) =>
    `form-select ${isLocked ? "" : touched[name] && fieldErrors[name] ? "is-invalid" : touched[name] && !fieldErrors[name] ? "is-valid" : ""}`;

  if (loading) return <Loader message="Loading visitor details for editing..." />;

  return (
    <div className="container-fluid py-2">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm border-0 p-4">
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h4 className="fw-bold mb-0">Edit Visitor Request</h4>
              {isLocked && (
                <span className="badge bg-secondary px-3 py-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  {visitorStatus} — Read Only
                </span>
              )}
            </div>

            {error && <div className="alert alert-danger mb-3">{error}</div>}
            {isLocked && (
              <div className="alert alert-warning mb-3 small">
                This visitor pass has been <strong>{visitorStatus === "CHECKED_IN" ? "checked in" : "checked out"}</strong> and can no longer be edited.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <h6 className="fw-bold text-muted text-uppercase small mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                Visitor Information
              </h6>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Full Name <span className="text-danger">*</span></label>
                  <input type="text" name="fullName" className={fieldClass("fullName")} placeholder="e.g. Michael Scott"
                    value={formData.fullName} onChange={handleChange} onBlur={handleBlur} required disabled={isLocked} />
                  {fieldErrors.fullName && <div className="invalid-feedback">{fieldErrors.fullName}</div>}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Email <span className="text-danger">*</span></label>
                  <input type="email" name="email" className={fieldClass("email")} placeholder="visitor@company.com"
                    value={formData.email} onChange={handleChange} onBlur={handleBlur} required disabled={isLocked} />
                  {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Phone <span className="text-danger">*</span></label>
                  <input type="tel" name="phone" className={fieldClass("phone")} placeholder="+91 98765 43210"
                    value={formData.phone} onChange={handleChange} onBlur={handleBlur} required disabled={isLocked} />
                  {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Company / Organization</label>
                  <input type="text" name="company" className="form-control" placeholder="Acme Corp (optional)"
                    value={formData.company} onChange={handleChange} disabled={isLocked} />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Government ID Type</label>
                  <select name="govtIdType" className="form-select" value={formData.govtIdType} onChange={handleChange} disabled={isLocked}>
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Employee Badge">Employee Badge</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Govt ID Number</label>
                  <input type="text" name="govtIdNumber" className="form-control" placeholder="XXXX-XXXX-XXXX (optional)"
                    value={formData.govtIdNumber} onChange={handleChange} disabled={isLocked} />
                </div>
              </div>

              <h6 className="fw-bold text-muted text-uppercase small mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                Visit Details
              </h6>
              <div className="row g-3 mb-4">
                <div className="col-md-12">
                  <label className="form-label fw-semibold text-muted">Employee to Visit <span className="text-danger">*</span></label>
                  <select name="employeeId" className={selectClass("employeeId")} value={formData.employeeId}
                    onChange={handleChange} onBlur={handleBlur} required disabled={isLocked}>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.department} - {emp.email})</option>
                    ))}
                  </select>
                  {fieldErrors.employeeId && <div className="invalid-feedback">{fieldErrors.employeeId}</div>}
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold text-muted">Visit Date <span className="text-danger">*</span></label>
                  <input type="date" name="visitDate" className={fieldClass("visitDate")} min={getTodayStr()}
                    value={formData.visitDate} onChange={handleChange} onBlur={handleBlur} required disabled={isLocked} />
                  {fieldErrors.visitDate && <div className="invalid-feedback">{fieldErrors.visitDate}</div>}
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold text-muted">Expected Arrival <span className="text-danger">*</span></label>
                  <input type="time" name="expectedTime" className={fieldClass("expectedTime")}
                    value={formData.expectedTime} onChange={handleChange} onBlur={handleBlur} required disabled={isLocked} />
                  {fieldErrors.expectedTime && <div className="invalid-feedback">{fieldErrors.expectedTime}</div>}
                </div>
              </div>

              <h6 className="fw-bold text-muted text-uppercase small mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                Purpose of Visit
              </h6>
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {PURPOSE_PRESETS.map((p) => (
                    <button key={p} type="button" disabled={isLocked}
                      className={`btn btn-sm ${formData.purpose === p ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => handlePurposeSelect(p)}>
                      {p}
                    </button>
                  ))}
                </div>
                <textarea name="purpose" className={`form-control ${touched.purpose && fieldErrors.purpose ? "is-invalid" : ""}`}
                  rows="2" placeholder="Or type a custom purpose..."
                  value={formData.purpose} onChange={handleChange} onBlur={handleBlur} required disabled={isLocked} />
                {fieldErrors.purpose && <div className="invalid-feedback">{fieldErrors.purpose}</div>}
              </div>

              <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
                <button type="button" onClick={() => navigate("/visitors")} className="btn btn-light" disabled={updating}>
                  {isLocked ? "Back to List" : "Cancel"}
                </button>
                {!isLocked && (
                  <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={updating}>
                    {updating ? "Saving Changes..." : "Save Changes"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditVisitor;
