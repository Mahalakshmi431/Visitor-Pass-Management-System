import { NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function Sidebar() {
  const { isAdmin, isReceptionist, isEmployee } = useAuth();

  return (
    <div className="bg-light border-end vh-100 p-3 shadow-sm d-none d-md-block" style={{ width: "250px", minWidth: "250px" }}>
      <div className="text-uppercase text-muted small fw-bold mb-3 px-2">Navigation</div>

      <div className="nav nav-pills flex-column gap-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "text-dark"}`}
        >
          <span>📊</span> Dashboard
        </NavLink>

        <NavLink
          to="/visitors"
          className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "text-dark"}`}
        >
          <span>📋</span> Visitor Requests
        </NavLink>

        {(isReceptionist || isAdmin) && (
          <NavLink
            to="/visitors/new"
            className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "text-dark"}`}
          >
            <span>➕</span> Register Visitor
          </NavLink>
        )}

        <NavLink
          to="/reports"
          className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "text-dark"}`}
        >
          <span>📈</span> Reports & Analytics
        </NavLink>

        {isAdmin && (
          <>
            <div className="text-uppercase text-muted small fw-bold mt-4 mb-2 px-2">Administration</div>
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "text-dark"}`}
            >
              <span>👥</span> User & Employees
            </NavLink>
          </>
        )}

        {isEmployee && (
          <div className="mt-4 p-3 bg-white border rounded shadow-sm">
            <div className="fw-semibold text-primary mb-1">Employee Portal</div>
            <div className="small text-muted">
              Review visitor requests assigned to you, approve/reject with remarks.
            </div>
          </div>
        )}

        {isReceptionist && (
          <div className="mt-4 p-3 bg-white border rounded shadow-sm">
            <div className="fw-semibold text-success mb-1">Reception Portal</div>
            <div className="small text-muted">
              Register visitors, issue pass codes, check in approved visitors, and track check-out logs.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
