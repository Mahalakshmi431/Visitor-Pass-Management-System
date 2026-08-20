import { useState, useEffect, useRef } from "react";
import {
  getNotificationsApi,
  getUnreadCountApi,
  markAsReadApi,
  markAllAsReadApi,
  deleteNotificationApi,
  clearAllNotificationsApi,
} from "../services/notificationService";

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await getUnreadCountApi();
      setUnreadCount(data.unreadCount);
    } catch {
      // silent
    }
  };

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const data = await getNotificationsApi();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markAsReadApi(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsReadApi();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotificationApi(id);
      const deleted = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (deleted && !deleted.isRead) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotificationsApi();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const getIcon = (type) => {
    const map = {
      VISITOR_REGISTERED: { icon: "bi-person-plus", color: "text-info" },
      VISITOR_APPROVED: { icon: "bi-check-circle", color: "text-success" },
      VISITOR_REJECTED: { icon: "bi-x-circle", color: "text-danger" },
      VISITOR_CHECKED_IN: { icon: "bi-box-arrow-in-right", color: "text-primary" },
      VISITOR_CHECKED_OUT: { icon: "bi-box-arrow-left", color: "text-secondary" },
      VISITOR_CANCELLED: { icon: "bi-dash-circle", color: "text-dark" },
      BULK_APPROVED: { icon: "bi-check-all", color: "text-success" },
      BULK_REJECTED: { icon: "bi-x-lg", color: "text-danger" },
      BULK_CHECKED_IN: { icon: "bi-box-arrow-in-right", color: "text-primary" },
      BULK_CHECKED_OUT: { icon: "bi-box-arrow-left", color: "text-secondary" },
    };
    return map[type] || { icon: "bi-bell", color: "text-muted" };
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button
        className="btn btn-link text-white position-relative p-2 text-decoration-none"
        onClick={toggleOpen}
        title="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style={{ fontSize: "0.65rem" }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-menu dropdown-menu-end show shadow" style={{ width: "380px", maxHeight: "480px", overflow: "hidden" }}>
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <h6 className="fw-bold mb-0">Notifications</h6>
            <div className="d-flex gap-2">
              {unreadCount > 0 && (
                <button className="btn btn-link btn-sm text-decoration-none p-0" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className="btn btn-link btn-sm text-danger text-decoration-none p-0" onClick={handleClearAll}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {loading ? (
              <div className="text-center py-4 text-muted small">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-25">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <p className="mb-0 small">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const { icon, color } = getIcon(n.type);
                return (
                  <div
                    key={n._id}
                    className={`d-flex align-items-start gap-2 px-3 py-2 border-bottom ${!n.isRead ? "bg-light" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => !n.isRead && handleMarkRead(n._id)}
                  >
                    <div className={`mt-1 ${color}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`bi ${icon}`}>
                        {n.type.includes("APPROVED") || n.type.includes("CHECKED_IN") ? (
                          <>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </>
                        ) : n.type.includes("REJECTED") || n.type.includes("CANCELLED") ? (
                          <>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </>
                        ) : n.type.includes("CHECKED_OUT") ? (
                          <>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </>
                        ) : (
                          <>
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </>
                        )}
                      </svg>
                    </div>
                    <div className="flex-grow-1 min-width-0">
                      <div className={`small fw-semibold ${!n.isRead ? "text-dark" : "text-muted"}`}>{n.title}</div>
                      <div className="small text-muted" style={{ lineHeight: "1.3" }}>{n.message}</div>
                      <div className="text-muted" style={{ fontSize: "0.7rem" }}>{formatTime(n.createdAt)}</div>
                    </div>
                    <button
                      className="btn btn-link btn-sm text-muted p-0 align-self-start flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }}
                      title="Dismiss"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
