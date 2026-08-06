import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "Administrator":
        return "bg-danger";
      case "Receptionist":
        return "bg-success";
      case "Employee":
        return "bg-primary";
      default:
        return "bg-secondary";
    }
  };

  return (
    <nav className="app-navbar navbar navbar-expand-lg navbar-dark navbar-dark-gradient py-2">
      <div className="container-fluid px-4">
        <Link className="navbar-brand d-flex align-items-center fw-bold text-uppercase" to="/dashboard">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="me-2 brand-shield" width="24" height="24" aria-hidden="true">
            <path d="M12 2 4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" />
          </svg>
          <span>Visitor Pass System</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {isAdmin && (
              <li className="nav-item">
                <Link className="nav-link" to="/users">
                  Manage Employees
                </Link>
              </li>
            )}
          </ul>

          {user && (
            <div className="d-flex align-items-center gap-3">
              <div className="text-end text-light">
                <div className="fw-semibold small">{user.name}</div>
                <span className={`badge ${getRoleBadgeColor(user.role)} small`}>
                  {user.role}
                </span>
              </div>

              <button onClick={handleLogout} className="btn btn-outline-danger btn-sm px-3">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;