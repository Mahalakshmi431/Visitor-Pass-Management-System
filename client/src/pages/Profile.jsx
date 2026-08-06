import useAuth from "../hooks/useAuth";

function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm border-0 p-4 bg-white text-center">
            <div className="profile-avatar mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="38" height="38" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3 className="fw-bold">{user.name}</h3>
            <p className="text-muted">{user.email}</p>

            <span className="badge bg-primary fs-6 px-3 py-2 align-self-center mb-4">
              ROLE: {user.role}
            </span>

            <div className="text-start border-top pt-3">
              <div className="row g-3">
                <div className="col-6">
                  <div className="small text-muted text-uppercase fw-bold">Department</div>
                  <div className="fw-semibold">{user.department || "General"}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted text-uppercase fw-bold">Phone</div>
                  <div className="fw-semibold">{user.phone || "Not Provided"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
