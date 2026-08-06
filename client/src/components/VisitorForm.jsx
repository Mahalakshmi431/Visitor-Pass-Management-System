import { useState, useEffect } from "react";
import { getEmployeesApi } from "../services/authService";

function VisitorForm({ onSubmit, loading, error }) {
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getCurrentTimeStr = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
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

  const [validationError, setValidationError] = useState("");

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    const todayStr = getTodayStr();
    const currentTimeStr = getCurrentTimeStr();

    // Rule 3 Client check: Visit date cannot be earlier than today
    if (formData.visitDate < todayStr) {
      setValidationError("Rule 3 Violation: Visit date cannot be earlier than the current date.");
      return;
    }

    // Rule 4 Client check: Expected arrival time cannot be earlier than current time for today's visits
    if (formData.visitDate === todayStr && formData.expectedTime < currentTimeStr) {
      setValidationError("Rule 4 Violation: Expected arrival time cannot be earlier than current time for today's visits.");
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="card shadow-sm border-0 p-4">
      <h4 className="fw-bold text-dark mb-4 border-bottom pb-2">New Visitor Registration</h4>

      {(validationError || error) && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Validation Error:</strong> {validationError || error}
        </div>
      )}

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">
            Visitor Full Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            className="form-control"
            placeholder="e.g. Michael Scott"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">
            Email Address <span className="text-danger">*</span>
          </label>
          <input
            type="email"
            name="email"
            className="form-control"
            placeholder="visitor@company.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">
            Phone Number <span className="text-danger">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            className="form-control"
            placeholder="+1 555-0199"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">Company / Organization</label>
          <input
            type="text"
            name="company"
            className="form-control"
            placeholder="Acme Corp"
            value={formData.company}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">Government ID Type</label>
          <select
            name="govtIdType"
            className="form-select"
            value={formData.govtIdType}
            onChange={handleChange}
          >
            <option value="Aadhaar Card">Aadhaar Card</option>
            <option value="Driving License">Driving License</option>
            <option value="Passport">Passport</option>
            <option value="Voter ID">Voter ID</option>
            <option value="Employee Badge">Employee Badge</option>
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">Govt ID Number (Optional)</label>
          <input
            type="text"
            name="govtIdNumber"
            className="form-control"
            placeholder="e.g. XXXX-XXXX-XXXX"
            value={formData.govtIdNumber}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-12">
          <label className="form-label fw-semibold text-muted">
            Employee to Visit <span className="text-danger">*</span>
          </label>
          {loadingEmployees ? (
            <div className="form-control text-muted">Loading employee directory...</div>
          ) : (
            <select
              name="employeeId"
              className="form-select"
              value={formData.employeeId}
              onChange={handleChange}
              required
            >
              {employees.length === 0 ? (
                <option value="">No employees available</option>
              ) : (
                employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.department} - {emp.email})
                  </option>
                ))
              )}
            </select>
          )}
          <div className="form-text">Note: Rule 5 limits pending requests per employee to 3.</div>
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">
            Visit Date <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            name="visitDate"
            className="form-control"
            min={getTodayStr()}
            value={formData.visitDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">
            Expected Arrival Time <span className="text-danger">*</span>
          </label>
          <input
            type="time"
            name="expectedTime"
            className="form-control"
            value={formData.expectedTime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-md-12">
          <label className="form-label fw-semibold text-muted">
            Purpose of Visit <span className="text-danger">*</span>
          </label>
          <textarea
            name="purpose"
            className="form-control"
            rows="3"
            placeholder="Specify reason for visit (e.g., Client meeting, Interview, Delivery)"
            value={formData.purpose}
            onChange={handleChange}
            required
          ></textarea>
        </div>
      </div>

      <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
        <button type="submit" className="btn btn-primary px-5 fw-semibold" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Registering Visitor...
            </>
          ) : (
            "Submit Visitor Request"
          )}
        </button>
      </div>
    </form>
  );
}

export default VisitorForm;
