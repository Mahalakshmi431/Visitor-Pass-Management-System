import { useState, useEffect } from "react";
import { getPreferencesApi, updatePreferencesApi } from "../services/notificationService";

const ALL_TYPES = [
  { key: "VISITOR_REGISTERED", label: "Visitor Registered", desc: "When a new visitor is registered in the system" },
  { key: "VISITOR_APPROVED", label: "Visit Approved", desc: "When a visit request is approved" },
  { key: "VISITOR_REJECTED", label: "Visit Rejected", desc: "When a visit request is rejected" },
  { key: "VISITOR_CHECKED_IN", label: "Visitor Checked In", desc: "When a visitor checks in at reception" },
  { key: "VISITOR_CHECKED_OUT", label: "Visitor Checked Out", desc: "When a visitor checks out" },
  { key: "VISITOR_CANCELLED", label: "Visit Cancelled", desc: "When a visit is cancelled" },
  { key: "BULK_APPROVED", label: "Bulk Approval", desc: "When multiple visits are approved at once" },
  { key: "BULK_REJECTED", label: "Bulk Rejection", desc: "When multiple visits are rejected at once" },
  { key: "BULK_CHECKED_IN", label: "Bulk Check-In", desc: "When multiple visitors are checked in at once" },
  { key: "BULK_CHECKED_OUT", label: "Bulk Check-Out", desc: "When multiple visitors are checked out at once" },
];

function NotificationSettings() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    try {
      const data = await getPreferencesApi();
      setPrefs(data);
    } catch {
      setMsg("Failed to load preferences.");
    } finally {
      setLoading(false);
    }
  };

  const toggleEmail = async () => {
    const updated = { ...prefs, emailEnabled: !prefs.emailEnabled };
    setPrefs(updated);
    await save(updated);
  };

  const toggleSms = async () => {
    const updated = { ...prefs, smsEnabled: !prefs.smsEnabled };
    setPrefs(updated);
    await save(updated);
  };

  const toggleEmailType = async (type) => {
    const types = prefs.emailTypes.includes(type)
      ? prefs.emailTypes.filter((t) => t !== type)
      : [...prefs.emailTypes, type];
    const updated = { ...prefs, emailTypes: types };
    setPrefs(updated);
    await save(updated);
  };

  const toggleSmsType = async (type) => {
    const types = prefs.smsTypes.includes(type)
      ? prefs.smsTypes.filter((t) => t !== type)
      : [...prefs.smsTypes, type];
    const updated = { ...prefs, smsTypes: types };
    setPrefs(updated);
    await save(updated);
  };

  const save = async (data) => {
    setSaving(true);
    try {
      await updatePreferencesApi(data);
      setMsg("Preferences saved.");
      setTimeout(() => setMsg(""), 2500);
    } catch {
      setMsg("Failed to save.");
      fetchPrefs();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!prefs) {
    return <div className="alert alert-danger">Could not load notification preferences.</div>;
  }

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h4 className="fw-bold mb-1">Notification Settings</h4>
              <p className="text-muted small mb-0">Choose how you want to receive notifications</p>
            </div>
            {saving && <span className="badge bg-warning text-dark">Saving...</span>}
          </div>

          {msg && (
            <div className={`alert py-2 small ${msg.includes("Failed") ? "alert-danger" : "alert-success"}`}>
              {msg}
            </div>
          )}

          {/* Email Section */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0">Email Notifications</h6>
                    <small className="text-muted">Receive notifications via email</small>
                  </div>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={prefs.emailEnabled} onChange={toggleEmail} style={{ cursor: "pointer" }} />
                </div>
              </div>

              {prefs.emailEnabled && (
                <div className="border-top pt-3">
                  <div className="row g-2">
                    {ALL_TYPES.map((t) => (
                      <div className="col-md-6" key={t.key}>
                        <div
                          className={`d-flex align-items-center gap-2 p-2 rounded border cursor-pointer ${prefs.emailTypes.includes(t.key) ? "border-primary bg-primary bg-opacity-5" : "border-light"}`}
                          onClick={() => toggleEmailType(t.key)}
                          style={{ cursor: "pointer" }}
                        >
                          <input
                            type="checkbox"
                            className="form-check-input m-0 flex-shrink-0"
                            checked={prefs.emailTypes.includes(t.key)}
                            onChange={() => toggleEmailType(t.key)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <div className="small fw-semibold">{t.label}</div>
                            <div className="text-muted" style={{ fontSize: "0.7rem" }}>{t.desc}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SMS Section */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-success bg-opacity-10 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0">SMS Notifications</h6>
                    <small className="text-muted">Receive text messages on your phone</small>
                  </div>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={prefs.smsEnabled} onChange={toggleSms} style={{ cursor: "pointer" }} />
                </div>
              </div>

              {prefs.smsEnabled && (
                <div className="border-top pt-3">
                  <div className="row g-2">
                    {ALL_TYPES.map((t) => (
                      <div className="col-md-6" key={t.key}>
                        <div
                          className={`d-flex align-items-center gap-2 p-2 rounded border ${prefs.smsTypes.includes(t.key) ? "border-success bg-success bg-opacity-5" : "border-light"}`}
                          onClick={() => toggleSmsType(t.key)}
                          style={{ cursor: "pointer" }}
                        >
                          <input
                            type="checkbox"
                            className="form-check-input m-0 flex-shrink-0"
                            checked={prefs.smsTypes.includes(t.key)}
                            onChange={() => toggleSmsType(t.key)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <div className="small fw-semibold">{t.label}</div>
                            <div className="text-muted" style={{ fontSize: "0.7rem" }}>{t.desc}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* In-App Section */}
          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle bg-warning bg-opacity-10 p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div>
                  <h6 className="fw-bold mb-0">In-App Notifications</h6>
                  <small className="text-muted">Always enabled. View notifications in the bell icon above.</small>
                </div>
                <span className="badge bg-success ms-auto">Always On</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
