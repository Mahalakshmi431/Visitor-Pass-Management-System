import { useState, useEffect } from "react";
import { getEmployeesApi } from "../services/authService";

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

function VisitorForm({ onSubmit, loading, error }) {
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getCurrentTimeStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    govtIdType: "Aadhaar Card",
    govtIdNumber: "",
    employeeId: "",
    visitDate: getTodayStr(),
    expectedTime: getCurrentTimeStr(),
    purpose: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await getEmployeesApi();
        setEmployees(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, employeeId: data[0]._id }));
        }
      } catch (err) {
        console.error("Error loading employees list:", err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  const validate = () => {
    const errors = {};
    const todayStr = getTodayStr();
    const currentTimeStr = getCurrentTimeStr();

    if (!formData.fullName.trim()) errors.fullName = "Visitor name is required";
    else if (formData.fullName.trim().length < 2) errors.fullName = "Name must be at least 2 characters";

    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Enter a valid email address";

    if (!formData.phone.trim()) errors.phone = "Phone number is required";
    else if (formData.phone.replace(/[^0-9+]/g, "").length < 7) errors.phone = "Enter a valid phone number";

    if (!formData.employeeId) errors.employeeId = "Please select an employee to visit";

    if (!formData.visitDate) errors.visitDate = "Visit date is required";
    else if (formData.visitDate < todayStr) errors.visitDate = "Rule 3: Visit date cannot be in the past";

    if (!formData.expectedTime) errors.expectedTime = "Arrival time is required";
    else if (formData.visitDate === todayStr && formData.expectedTime < currentTimeStr) {
      errors.expectedTime = "Rule 4: Arrival time cannot be in the past for today";
    }

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setTouched({
      fullName: true, email: true, phone: true, employeeId: true,
      visitDate: true, expectedTime: true, purpose: true,
    });

    if (Object.keys(errors).length > 0) return;
    onSubmit(formData);
  };

  const fieldClass = (name) =>
    `form-control ${touched[name] && fieldErrors[name] ? "is-invalid" : touched[name] && !fieldErrors[name] ? "is-valid" : ""}`;

  const selectClass = (name) =>
    `form-select ${touched[name] && fieldErrors[name] ? "is-invalid" : touched[name] && !fieldErrors[name] ? "is-valid" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card shadow-sm border-0 p-4">
      <div className="d-flex align-items-center mb-4 border-bottom pb-3">
        <div className="bg-primary bg-opacity-10 rounded-3 p-2 me-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24" className="text-primary">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>
        <div>
          <h4 className="fw-bold text-dark mb-0">New Visitor Registration</h4>
          <small className="text-muted">Fill in the visitor details below. Fields marked with * are required.</small>
        </div>
      </div>

      {(error || Object.values(fieldErrors).some(Boolean)) && (
        <div className="alert alert-danger small mb-3">
          {error && <div className="mb-1"><strong>Server Error:</strong> {error}</div>}
          {Object.entries(fieldErrors).map(([key, val]) =>
            val ? <div key={key}>{val}</div> : null
          )}
        </div>
      )}

      {/* Visitor Information */}
      <h6 className="fw-bold text-muted text-uppercase small mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        Visitor Information
      </h6>
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">Full Name <span className="text-danger">*</span></label>
          <input type="text" name="fullName" className={fieldClass("fullName")} placeholder="e.g. Michael Scott"
            value={formData.fullName} onChange={handleChange} onBlur={handleBlur} required />
          {fieldErrors.fullName && <div className="invalid-feedback">{fieldErrors.fullName}</div>}
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">Email <span className="text-danger">*</span></label>
          <input type="email" name="email" className={fieldClass("email")} placeholder="visitor@company.com"
            value={formData.email} onChange={handleChange} onBlur={handleBlur} required />
          {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">Phone <span className="text-danger">*</span></label>
          <input type="tel" name="phone" className={fieldClass("phone")} placeholder="+91 98765 43210"
            value={formData.phone} onChange={handleChange} onBlur={handleBlur} required />
          {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">Company / Organization</label>
          <input type="text" name="company" className="form-control" placeholder="Acme Corp (optional)"
            value={formData.company} onChange={handleChange} />
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">Government ID Type</label>
          <select name="govtIdType" className="form-select" value={formData.govtIdType} onChange={handleChange}>
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
            value={formData.govtIdNumber} onChange={handleChange} />
        </div>
      </div>

      {/* Visit Details */}
      <h6 className="fw-bold text-muted text-uppercase small mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        Visit Details
      </h6>
      <div className="row g-3 mb-4">
        <div className="col-md-12">
          <label className="form-label fw-semibold text-muted">Employee to Visit <span className="text-danger">*</span></label>
          {loadingEmployees ? (
            <div className="form-control text-muted">Loading employee directory...</div>
          ) : (
            <>
              <select name="employeeId" className={selectClass("employeeId")} value={formData.employeeId}
                onChange={handleChange} onBlur={handleBlur} required>
                {employees.length === 0 ? (
                  <option value="">No employees available</option>
                ) : (
                  employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.department} - {emp.email})</option>
                  ))
                )}
              </select>
              {fieldErrors.employeeId && <div className="invalid-feedback">{fieldErrors.employeeId}</div>}
            </>
          )}
          <div className="form-text">Rule 5: Each employee can have at most 3 pending requests.</div>
        </div>

        <div className="col-md-4">
          <label className="form-label fw-semibold text-muted">Visit Date <span className="text-danger">*</span></label>
          <input type="date" name="visitDate" className={fieldClass("visitDate")} min={getTodayStr()}
            value={formData.visitDate} onChange={handleChange} onBlur={handleBlur} required />
          {fieldErrors.visitDate && <div className="invalid-feedback">{fieldErrors.visitDate}</div>}
        </div>

        <div className="col-md-4">
          <label className="form-label fw-semibold text-muted">Expected Arrival <span className="text-danger">*</span></label>
          <input type="time" name="expectedTime" className={fieldClass("expectedTime")}
            value={formData.expectedTime} onChange={handleChange} onBlur={handleBlur} required />
          {fieldErrors.expectedTime && <div className="invalid-feedback">{fieldErrors.expectedTime}</div>}
        </div>

        <div className="col-md-4 d-flex align-items-end">
          <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={() => {
            setFormData((prev) => ({ ...prev, visitDate: getTodayStr(), expectedTime: getCurrentTimeStr() }));
          }}>
            Set to Now
          </button>
        </div>
      </div>

      {/* Purpose */}
      <h6 className="fw-bold text-muted text-uppercase small mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
        Purpose of Visit
      </h6>
      <div className="mb-3">
        <div className="d-flex flex-wrap gap-2 mb-3">
          {PURPOSE_PRESETS.map((p) => (
            <button key={p} type="button"
              className={`btn btn-sm ${formData.purpose === p ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => handlePurposeSelect(p)}>
              {p}
            </button>
          ))}
        </div>
        <textarea name="purpose" className={`form-control ${touched.purpose && fieldErrors.purpose ? "is-invalid" : ""}`}
          rows="2" placeholder="Or type a custom purpose..."
          value={formData.purpose} onChange={handleChange} onBlur={handleBlur} required />
        {fieldErrors.purpose && <div className="invalid-feedback">{fieldErrors.purpose}</div>}
      </div>

      {/* Submit */}
      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
        <small className="text-muted">All information is kept confidential per company policy.</small>
        <button type="submit" className="btn btn-primary px-5 fw-semibold" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Registering...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Submit Visitor Request
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default VisitorForm;
