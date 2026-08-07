import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import PasswordInput from "../components/PasswordInput";
import { getDemoAccountsApi } from "../services/authService";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const [demoAccounts, setDemoAccounts] = useState([]);

  useEffect(() => {
    let isMounted = true;
    getDemoAccountsApi()
      .then((accounts) => {
        if (isMounted) setDemoAccounts(accounts);
      })
      .catch(() => {
        if (isMounted) setDemoAccounts([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
      const message = err.response?.data?.message;
      setError(
        message ||
          (err.response
            ? "Login failed. Invalid email or password."
            : "Cannot reach the server. Please make sure the backend is running and try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fillQuickAccount = (email, password) => {
    setFormData({ email, password });
    setError("");
  };

  return (
    <div className="login-page min-vh-100 d-flex align-items-center justify-content-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
              <div className="card-header app-login-header text-white text-center py-4">
                <div className="login-shield mx-auto mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="34" height="34" aria-hidden="true">
                    <path d="M12 2 4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" />
                  </svg>
                </div>
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
                    <PasswordInput
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
                    {demoAccounts.length === 0 ? (
                      <div className="small text-muted text-center py-2">
                        No demo accounts available. Please contact the administrator.
                      </div>
                    ) : (
                      demoAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => fillQuickAccount(acc.email, acc.password)}
                          className="btn btn-outline-secondary btn-sm text-start d-flex justify-content-between align-items-center"
                          title={`Click to fill: ${acc.email}`}
                        >
                          <span className="fw-semibold">{acc.name}</span>
                          <span>
                            <span
                              className={`badge me-2 ${
                                acc.role === "Administrator"
                                  ? "bg-danger"
                                  : acc.role === "Receptionist"
                                  ? "bg-success"
                                  : "bg-primary"
                              }`}
                            >
                              {acc.role}
                            </span>
                            <span className="small text-muted">{acc.email}</span>
                          </span>
                        </button>
                      ))
                    )}
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