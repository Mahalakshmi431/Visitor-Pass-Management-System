import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getDashboardStatsApi, getActivityLogsApi, getAnalyticsApi } from "../services/reportService";
import { StatusDonut, DailyTrend, TopCompanies, HourlyDistribution, TopHosts, PurposeBreakdown } from "../components/DashboardCharts";
import Loader from "../components/Loader";

function Dashboard() {
  const { user, isAdmin, isReceptionist, isEmployee } = useAuth();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsData = await getDashboardStatsApi();
        setStats(statsData);

        const analyticsData = await getAnalyticsApi({ range: "week" });
        setAnalytics(analyticsData);

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

      {/* Analytics Charts */}
      <div className="card shadow-sm border-0 p-4 mb-4 bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">Analytics Overview</h5>
          <span className="badge bg-light text-dark border fw-normal">Last 7 days</span>
        </div>
        {analytics && analytics.totalVisitors > 0 ? (
          <>
            <div className="row g-3 mb-3">
              <div className="col-lg-4">
                <StatusDonut data={analytics.statusDistribution} />
              </div>
              <div className="col-lg-8">
                <DailyTrend data={analytics.dailyTrend} />
              </div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-lg-4">
                <TopCompanies data={analytics.topCompanies} />
              </div>
              <div className="col-lg-4">
                <TopHosts data={analytics.topHosts} />
              </div>
              <div className="col-lg-4">
                <HourlyDistribution data={analytics.hourlyDistribution} />
              </div>
            </div>
            <div className="row g-3">
              <div className="col-lg-12">
                <PurposeBreakdown data={analytics.purposeBreakdown} />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-muted py-5">
            <p className="mb-1">No analytics data for the last 7 days.</p>
            <p className="small">Charts will appear once visitor records exist.</p>
          </div>
        )}
      </div>

      {/* Quick Action Banner */}
      <div className="card shadow-sm border-0 p-4 mb-4 bg-white">
        <h5 className="fw-bold mb-3">Quick Navigation</h5>
        <div className="d-flex flex-wrap gap-3">
          <Link to="/visitors" className="btn btn-outline-primary px-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="me-2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            View All Visitor Requests
          </Link>

          {(isReceptionist || isAdmin) && (
            <Link to="/visitors/new" className="btn btn-outline-success px-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="me-2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Register Visitor
            </Link>
          )}

          <Link to="/reports" className="btn btn-outline-secondary px-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="me-2" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Summary Reports
          </Link>

          {isAdmin && (
            <Link to="/users" className="btn btn-outline-danger px-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" className="me-2" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Manage Employees
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