import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVisitorByIdApi, updateVisitorApi } from "../services/visitorService";
import { getEmployeesApi } from "../services/authService";
import Loader from "../components/Loader";

function EditVisitor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);

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

          if (v.status === "CHECKED_IN" || v.status === "CHECKED_OUT") {
            setError(`Cannot edit visitor pass with status '${v.status}'`);
          }

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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  if (loading) return <Loader message="Loading visitor details for editing..." />;

  return (
    <div className="container-fluid py-2">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm border-0 p-4">
            <h4 className="fw-bold mb-3 border-bottom pb-2">Edit Visitor Request</h4>

            {error && <div className="alert alert-danger mb-3">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Visitor Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    className="form-control"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-control"
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
                  <label className="form-label fw-semibold text-muted">Govt ID Number</label>
                  <input
                    type="text"
                    name="govtIdNumber"
                    className="form-control"
                    value={formData.govtIdNumber}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-12">
                  <label className="form-label fw-semibold text-muted">Host Employee</label>
                  <select
                    name="employeeId"
                    className="form-select"
                    value={formData.employeeId}
                    onChange={handleChange}
                    required
                  >
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.department} - {emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Visit Date</label>
                  <input
                    type="date"
                    name="visitDate"
                    className="form-control"
                    value={formData.visitDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">Expected Arrival Time</label>
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
                  <label className="form-label fw-semibold text-muted">Purpose of Visit</label>
                  <textarea
                    name="purpose"
                    className="form-control"
                    rows="3"
                    value={formData.purpose}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
                <button
                  type="button"
                  onClick={() => navigate("/visitors")}
                  className="btn btn-light"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={updating}>
                  {updating ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditVisitor;
