import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light text-center">
      <div>
        <h1 className="display-1 fw-bold text-muted">404</h1>
        <h3 className="fw-bold mb-3">Page Not Found</h3>
        <p className="text-muted mb-4">The requested resource or page does not exist.</p>
        <Link to="/dashboard" className="btn btn-primary px-4 fw-semibold">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFound;