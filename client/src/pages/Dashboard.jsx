import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getDashboardStatsApi, getActivityLogsApi } from "../services/reportService";
import Loader from "../components/Loader";

function Dashboard() {
  const { user, isAdmin, isReceptionist, isEmployee } = useAuth();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsData = await getDashboardStatsApi();
        setStats(statsData);

        if (isAdmin) {
          const logsData = await getActivityLogsApi();
          setActivities(logsData);
        }
      } catch (err) {
        console.error("Error fetching dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  if (loading) {
    return <Loader message="Loading role dashboard metrics..." />;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Welcome back, {user?.name}!</h2>
          <p className="text-muted mb-0">
            Role: <span className="badge bg-dark ms-1">{user?.role}</span> — Overview of visitor activities and requests.
          </p>
        </div>

        {(isReceptionist || isAdmin) && (
          <Link to="/visitors/new" className="btn btn-primary px-4 fw-semibold shadow-sm">
            + Register New Visitor
          </Link>
        )}
      </div>

      {/* Role-Specific Metric Cards */}
      <div className="row g-3 mb-4">
        {isAdmin && stats && (
          <>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-primary border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Total Employees</div>
                <div className="fs-2 fw-bold text-dark mt-1">{stats.totalEmployees || 0}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-info border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Today's Visitors</div>
                <div className="fs-2 fw-bold text-info mt-1">{stats.todayVisitors || 0}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-success border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Currently Inside</div>
                <div className="fs-2 fw-bold text-success mt-1">{stats.currentlyInside || 0}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-warning border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Pending Approvals</div>
                <div className="fs-2 fw-bold text-warning mt-1">{stats.pendingRequests || 0}</div>
              </div>
            </div>
          </>
        )}

        {isReceptionist && stats && (
          <>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-info border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Today Scheduled</div>
                <div className="fs-2 fw-bold text-info mt-1">{stats.todayScheduled || 0}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-success border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Currently Inside</div>
                <div className="fs-2 fw-bold text-success mt-1">{stats.currentlyInside || 0}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-warning border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Pending Approvals</div>
                <div className="fs-2 fw-bold text-warning mt-1">{stats.pendingApprovals || 0}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-secondary border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Checked Out Today</div>
                <div className="fs-2 fw-bold text-secondary mt-1">{stats.checkedOutToday || 0}</div>
              </div>
            </div>
          </>
        )}

        {isEmployee && stats && (
          <>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-warning border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Awaiting My Approval</div>
                <div className="fs-2 fw-bold text-warning mt-1">{stats.pendingRequests || 0}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-success border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Approved By Me</div>
                <div className="fs-2 fw-bold text-success mt-1">{stats.approvedByMe || 0}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-primary border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Visits Scheduled Today</div>
                <div className="fs-2 fw-bold text-primary mt-1">{stats.todayVisits || 0}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0 border-start border-info border-4 p-3 bg-white">
                <div className="text-uppercase text-muted small fw-bold">Currently Visiting Me</div>
                <div className="fs-2 fw-bold text-info mt-1">{stats.currentlyVisitingMe || 0}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Action Banner */}
      <div className="card shadow-sm border-0 p-4 mb-4 bg-white">
        <h5 className="fw-bold mb-3">Quick Navigation</h5>
        <div className="d-flex flex-wrap gap-3">
          <Link to="/visitors" className="btn btn-outline-primary px-4">
            📋 View All Visitor Requests
          </Link>

          {(isReceptionist || isAdmin) && (
            <Link to="/visitors/new" className="btn btn-outline-success px-4">
              ➕ Register Visitor
            </Link>
          )}

          <Link to="/reports" className="btn btn-outline-secondary px-4">
            📈 Summary Reports
          </Link>

          {isAdmin && (
            <Link to="/users" className="btn btn-outline-danger px-4">
              👥 Manage Employees
            </Link>
          )}
        </div>
      </div>

      {/* Activity History for Admin */}
      {isAdmin && activities.length > 0 && (
        <div className="card shadow-sm border-0 p-4 bg-white">
          <h5 className="fw-bold mb-3">Recent Activity Trail</h5>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>Pass Code</th>
                  <th>Action</th>
                  <th>Performed By</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {activities.slice(0, 5).map((act) => (
                  <tr key={act._id}>
                    <td className="small text-muted">{new Date(act.timestamp).toLocaleString()}</td>
                    <td><span className="badge bg-light text-dark border">{act.passCode}</span></td>
                    <td>
                      <span className={`badge ${act.action === "APPROVED" ? "bg-success" : act.action === "REJECTED" ? "bg-danger" : act.action === "CHECKED_IN" ? "bg-primary" : "bg-secondary"}`}>
                        {act.action}
                      </span>
                    </td>
                    <td className="fw-semibold">{act.performedBy} ({act.performedByRole})</td>
                    <td className="small text-muted">{act.remarks || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;