import api from "./api";

export const loginApi = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

export const getMeApi = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

export const getDemoAccountsApi = async () => {
  const response = await api.get("/auth/demo-accounts");
  return response.data;
};

export const getEmployeesApi = async () => {
  const response = await api.get("/users/employees");
  return response.data;
};

export const getUsersApi = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const createUserApi = async (userData) => {
  const response = await api.post("/users", userData);
  return response.data;
};

export const toggleUserStatusApi = async (userId) => {
  const response = await api.put(`/users/${userId}/toggle-status`);
  return response.data;
};

export const changePasswordApi = async (passwordData) => {
  const response = await api.put("/auth/change-password", passwordData);
  return response.data;
};

