import { useState, useEffect } from "react";
import { getUsersApi, createUserApi, toggleUserStatusApi, updateUserApi } from "../services/authService";
import Loader from "../components/Loader";
import PasswordInput from "../components/PasswordInput";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Employee",
    department: "Engineering",
    phone: "",
  });
  const [creating, setCreating] = useState(false);

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "", department: "", phone: "" });
  const [editing, setEditing] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ show: false, userId: null, action: "", label: "" });

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await getUsersApi();
        if (isMounted) setUsers(data);
      } catch (err) {
        if (isMounted) setError(err.response?.data?.message || "Failed to fetch users.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUsers();
    return () => { isMounted = false; };
  }, []);

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsersApi();
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      await createUserApi(formData);
      setSuccess("New user account created successfully!");
      setFormData({ name: "", email: "", password: "", role: "Employee", department: "Engineering", phone: "" });
      refreshUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user account.");
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role, department: user.department || "", phone: user.phone || "" });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async () => {
    setEditing(true);
    setError("");
    setSuccess("");
    try {
      await updateUserApi(editUser._id, editForm);
      setSuccess(`Account for ${editForm.name} updated successfully.`);
      setEditUser(null);
      refreshUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user account.");
    } finally {
      setEditing(false);
    }
  };

  const openConfirmModal = (userId, action) => {
    const user = users.find((u) => u._id === userId);
    const label = action === "activate" ? "activate" : "deactivate";
    setConfirmModal({ show: true, userId, action, label, userName: user?.name || "" });
  };

  const handleConfirmToggle = async () => {
    setError("");
    setSuccess("");
    try {
      await toggleUserStatusApi(confirmModal.userId);
      setSuccess(`User account ${confirmModal.label}d successfully.`);
      setConfirmModal({ show: false, userId: null, action: "", label: "" });
      refreshUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user status.");
      setConfirmModal({ show: false, userId: null, action: "", label: "" });
    }
  };

  if (loading) return <Loader message="Loading user directory..." />;

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">User & Employee Management</h2>
        <p className="text-muted mb-0">Create, manage, and toggle status for staff and employee accounts.</p>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 p-4 bg-white">
            <h5 className="fw-bold mb-3">Create User Account</h5>
            <form onSubmit={handleCreateUser}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Full Name</label>
                <input type="text" name="name" className="form-control" placeholder="e.g. Pam Beesly" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Email Address</label>
                <input type="email" name="email" className="form-control" placeholder="pam@system.com" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Password</label>
                <PasswordInput name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required minLength="6" />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Role</label>
                <select name="role" className="form-select" value={formData.role} onChange={handleChange}>
                  <option value="Employee">Employee</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Department</label>
                <input type="text" name="department" className="form-control" placeholder="Sales / HR / IT" value={formData.department} onChange={handleChange} />
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold text-muted">Phone Number</label>
                <input type="text" name="phone" className="form-control" placeholder="+1 555-0105" value={formData.phone} onChange={handleChange} />
              </div>
              <button type="submit" className="btn btn-primary w-100 fw-bold" disabled={creating}>
                {creating ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0 bg-white overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="fw-semibold">{u.name}</td>
                      <td className="small">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === "Administrator" ? "bg-danger" : u.role === "Receptionist" ? "bg-success" : "bg-primary"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="small text-muted">{u.department}</td>
                      <td>
                        <span className={`badge ${u.isActive ? "bg-success" : "bg-secondary"}`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-2">
                          <button onClick={() => openEditModal(u)} className="btn btn-outline-primary btn-sm">Edit</button>
                          <button
                            onClick={() => openConfirmModal(u._id, u.isActive ? "deactivate" : "activate")}
                            className={`btn btn-sm ${u.isActive ? "btn-outline-danger" : "btn-outline-success"}`}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Edit User — {editUser.name}</h5>
                <button type="button" className="btn-close" onClick={() => setEditUser(null)} disabled={editing}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Full Name</label>
                  <input type="text" name="name" className="form-control" value={editForm.name} onChange={handleEditChange} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Email</label>
                  <input type="email" name="email" className="form-control" value={editForm.email} onChange={handleEditChange} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Role</label>
                  <select name="role" className="form-select" value={editForm.role} onChange={handleEditChange}>
                    <option value="Employee">Employee</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Department</label>
                  <input type="text" name="department" className="form-control" value={editForm.department} onChange={handleEditChange} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Phone</label>
                  <input type="text" name="phone" className="form-control" value={editForm.phone} onChange={handleEditChange} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setEditUser(null)} disabled={editing}>Cancel</button>
                <button type="button" className="btn btn-primary fw-semibold" onClick={handleSaveEdit} disabled={editing}>
                  {editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Confirm {confirmModal.label === "activate" ? "Activation" : "Deactivation"}</h5>
                <button type="button" className="btn-close" onClick={() => setConfirmModal({ show: false, userId: null, action: "", label: "" })}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to <strong>{confirmModal.label}</strong> the account for <strong>{confirmModal.userName}</strong>?</p>
                {confirmModal.action === "deactivate" && (
                  <p className="text-danger small mb-0">This user will not be able to log in until reactivated.</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setConfirmModal({ show: false, userId: null, action: "", label: "" })}>Cancel</button>
                <button type="button" className={`btn fw-semibold ${confirmModal.action === "activate" ? "btn-success" : "btn-danger"}`} onClick={handleConfirmToggle}>
                  {confirmModal.label === "activate" ? "Activate" : "Deactivate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
