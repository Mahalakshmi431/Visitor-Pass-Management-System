import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function Navbar() {
  const { user, logout, isAdmin, isReceptionist } = useAuth();
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
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm py-2">
      <div className="container-fluid px-4">
        <Link className="navbar-brand d-flex align-items-center fw-bold text-uppercase" to="/dashboard">
          <span className="me-2 text-warning fs-4">🛡️</span>
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
            <li className="nav-item">
              <Link className="nav-link" to="/dashboard">
                Dashboard
              </Link>
            </li>

            <li className="nav-item">
              <Link className="nav-link" to="/visitors">
                Visitor Records
              </Link>
            </li>

            {(isReceptionist || isAdmin) && (
              <li className="nav-item">
                <Link className="nav-link text-warning fw-semibold" to="/visitors/new">
                  + Register Visitor
                </Link>
              </li>
            )}

            <li className="nav-item">
              <Link className="nav-link" to="/reports">
                Reports
              </Link>
            </li>

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