import { NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function Sidebar() {
  const { isAdmin, isReceptionist, isEmployee } = useAuth();

  return (
    <div className="app-sidebar bg-white border-end vh-100 p-3 d-none d-md-block" style={{ width: "250px", minWidth: "250px" }}>
      <div className="text-uppercase text-muted small fw-bold mb-3 px-2">Navigation</div>

      <div className="nav nav-pills flex-column gap-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "text-dark"}`}
        >
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
          </span> Dashboard
        </NavLink>

        <NavLink
          to="/visitors"
          className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "text-dark"}`}
        >
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </span> Visitor Requests
        </NavLink>

        {(isReceptionist || isAdmin) && (
          <NavLink
            to="/visitors/new"
            className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "text-dark"}`}
          >
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </span> Register Visitor
          </NavLink>
        )}

        <NavLink
          to="/reports"
          className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "text-dark"}`}
        >
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </span> Reports & Analytics
        </NavLink>

        {isAdmin && (
          <>
            <div className="text-uppercase text-muted small fw-bold mt-4 mb-2 px-2">Administration</div>
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "text-dark"}`}
            >
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span> User & Employees
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
