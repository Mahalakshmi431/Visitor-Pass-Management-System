import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(formData.email, formData.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillQuickAccount = (email, password) => {
    setFormData({ email, password });
    setError("");
  };

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
              <div className="card-header bg-dark text-white text-center py-4">
                <div className="fs-1 mb-2">🛡️</div>
                <h3 className="fw-bold mb-1">Visitor Pass System</h3>
                <p className="text-muted small mb-0">Secure Portal Login</p>
              </div>

              <div className="card-body p-4 p-md-5">
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show small" role="alert">
                    <strong>Authentication Error:</strong> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-muted">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control form-control-lg"
                      placeholder="admin@system.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold text-muted">Password</label>
                    <input
                      type="password"
                      name="password"
                      className="form-control form-control-lg"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 fw-bold shadow-sm"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Authenticating...
                      </>
                    ) : (
                      "Sign In to Account"
                    )}
                  </button>
                </form>

                <div className="mt-4 pt-3 border-top">
                  <div className="text-uppercase text-muted small fw-bold mb-2 text-center">
                    Demo Role Accounts (Click to Fill)
                  </div>
                  <div className="d-flex flex-column gap-2">
                    <button
                      type="button"
                      onClick={() => fillQuickAccount("admin@system.com", "admin123")}
                      className="btn btn-outline-danger btn-sm text-start"
                    >
                      👑 <strong>Admin:</strong> admin@system.com
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickAccount("receptionist@system.com", "receptionist123")}
                      className="btn btn-outline-success btn-sm text-start"
                    >
                      🏢 <strong>Receptionist:</strong> receptionist@system.com
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickAccount("employee@system.com", "employee123")}
                      className="btn btn-outline-primary btn-sm text-start"
                    >
                      👤 <strong>Employee:</strong> employee@system.com
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;