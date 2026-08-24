import { Routes, Route, Outlet } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import VisitorList from "../pages/VisitorList";
import AddVisitor from "../pages/AddVisitor";
import EditVisitor from "../pages/EditVisitor";
import VisitorDetails from "../pages/VisitorDetails";
import UserManagement from "../pages/UserManagement";
import Reports from "../pages/Reports";
import Profile from "../pages/Profile";
import ChangePassword from "../pages/ChangePassword";
import NotificationSettings from "../pages/NotificationSettings";
import NotFound from "../pages/NotFound";

import ProtectedRoute from "../components/ProtectedRoute";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

function MainLayout() {
  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Navbar />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <main className="app-main flex-grow-1 p-4 overflow-auto">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/" element={<Login />} />

      {/* Protected Main Layout Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/visitors" element={<VisitorList />} />

          <Route path="/visitors/new" element={<AddVisitor />} />
          <Route path="/visitors/:id/edit" element={<EditVisitor />} />

          <Route path="/visitors/:id" element={<VisitorDetails />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />

          {/* Admin User Management route */}
          <Route element={<ProtectedRoute allowedRoles={["Administrator"]} />}>
            <Route path="/users" element={<UserManagement />} />
          </Route>
        </Route>
      </Route>

      {/* 404 Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;