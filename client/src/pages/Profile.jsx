import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import api from "../services/api";
import { getPreferencesApi, updatePreferencesApi } from "../services/notificationService";

function Profile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    department: user?.department || "",
  });
  const [saveMsg, setSaveMsg] = useState("");
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    getPreferencesApi().then(setPrefs).catch(() => {});
  }, []);

  if (!user) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await api.put("/auth/update-profile", formData);
      await refreshUser();
      setEditing(false);
      setSaveMsg("Profile updated successfully.");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      setSaveMsg("");
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "Administrator": return "bg-danger";
      case "Receptionist": return "bg-success";
      default: return "bg-primary";
    }
  };

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

            <span className={`badge ${getRoleBadgeColor(user.role)} fs-6 px-3 py-2 align-self-center mb-4`}>
              ROLE: {user.role}
            </span>

            {saveMsg && <div className="alert alert-success py-2 small">{saveMsg}</div>}

            <div className="text-start border-top pt-3">
              {editing ? (
                <>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Full Name</label>
                    <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Phone</label>
                    <input type="text" name="phone" className="form-control" value={formData.phone} onChange={handleChange} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Department</label>
                    <input type="text" name="department" className="form-control" value={formData.department} onChange={handleChange} />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary btn-sm flex-grow-1 fw-semibold" onClick={handleSave}>Save Changes</button>
                    <button className="btn btn-light btn-sm" onClick={() => { setEditing(false); setFormData({ name: user.name, phone: user.phone || "", department: user.department || "" }); }}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <div className="small text-muted text-uppercase fw-bold">Department</div>
                      <div className="fw-semibold">{user.department || "General"}</div>
                    </div>
                    <div className="col-6">
                      <div className="small text-muted text-uppercase fw-bold">Phone</div>
                      <div className="fw-semibold">{user.phone || "Not Provided"}</div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary btn-sm flex-grow-1" onClick={() => setEditing(true)}>Edit Profile</button>
                    <Link to="/change-password" className="btn btn-outline-warning btn-sm flex-grow-1">Change Password</Link>
                  </div>

                  {prefs && (
                    <div className="border-top pt-3 mt-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="small fw-bold text-muted text-uppercase">Quick Notification Toggles</span>
                        <Link to="/notification-settings" className="small text-primary text-decoration-none">Manage All</Link>
                      </div>
                      <div className="d-flex gap-3">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={prefs.emailEnabled}
                            onChange={async () => {
                              const prev = prefs;
                              const updated = { ...prefs, emailEnabled: !prefs.emailEnabled };
                              setPrefs(updated);
                              try { await updatePreferencesApi(updated); } catch { setPrefs(prev); }
                            }}
                          />
                          <label className="form-check-label small">Email</label>
                        </div>
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={prefs.smsEnabled}
                            onChange={async () => {
                              const prev = prefs;
                              const updated = { ...prefs, smsEnabled: !prefs.smsEnabled };
                              setPrefs(updated);
                              try { await updatePreferencesApi(updated); } catch { setPrefs(prev); }
                            }}
                          />
                          <label className="form-check-label small">SMS</label>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
