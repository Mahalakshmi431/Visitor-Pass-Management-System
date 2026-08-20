import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";

const PALETTE = ["#eab308", "#16a34a", "#2563eb", "#6b7280", "#dc2626", "#8b5cf6", "#06b6d4", "#f97316"];
const STATUS_COLORS = { PENDING: "#eab308", APPROVED: "#16a34a", CHECKED_IN: "#2563eb", CHECKED_OUT: "#6b7280", REJECTED: "#dc2626" };

const Card = ({ title, children, className = "" }) => (
  <div className={`card shadow-sm border-0 bg-white ${className}`}>
    <div className="card-header bg-white border-bottom fw-bold small text-dark py-3">{title}</div>
    <div className="card-body p-3">{children}</div>
  </div>
);

const Empty = () => (
  <div className="text-center text-muted py-5">
    <div className="fs-1 mb-2">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    </div>
    <p className="small">No data available for charts yet.</p>
  </div>
);

// ─── Status Donut ────────────────────────────────────────────
export function StatusDonut({ data }) {
  if (!data || data.length === 0) return <Card title="Status Distribution"><Empty /></Card>;
  return (
    <Card title="Status Distribution">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
            {data.map((e) => <Cell key={e.name} fill={STATUS_COLORS[e.name] || "#8884d8"} />)}
          </Pie>
          <Tooltip />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Daily Trend ─────────────────────────────────────────────
export function DailyTrend({ data }) {
  if (!data || data.length === 0) return <Card title="Daily Visit Trend"><Empty /></Card>;
  return (
    <Card title="Daily Visit Trend">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="approved" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} name="Approved" />
          <Bar dataKey="checkedIn" stackId="a" fill="#2563eb" name="Checked In" />
          <Bar dataKey="checkedOut" stackId="a" fill="#6b7280" radius={[3, 3, 0, 0]} name="Checked Out" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Top Companies ───────────────────────────────────────────
export function TopCompanies({ data }) {
  if (!data || data.length === 0) return <Card title="Top Visiting Companies"><Empty /></Card>;
  return (
    <Card title="Top Visiting Companies">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={18} name="Visitors" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Top Hosts ───────────────────────────────────────────────
export function TopHosts({ data }) {
  if (!data || data.length === 0) return <Card title="Top Host Employees"><Empty /></Card>;
  return (
    <Card title="Top Host Employees">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={18} name="Visitors" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Hourly Distribution ─────────────────────────────────────
export function HourlyDistribution({ data }) {
  if (!data || data.every((d) => d.count === 0)) return <Card title="Hourly Visit Distribution"><Empty /></Card>;
  return (
    <Card title="Hourly Visit Distribution">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} barSize={14} name="Visits" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Purpose Breakdown ───────────────────────────────────────
export function PurposeBreakdown({ data }) {
  if (!data || data.length === 0) return <Card title="Visit Purposes"><Empty /></Card>;
  const chartData = data.map((d) => ({ ...d, name: d.name.length > 25 ? d.name.slice(0, 22) + "..." : d.name }));
  return (
    <Card title="Visit Purposes">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} barSize={18} name="Visits" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
