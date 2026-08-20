import api from "./api";

export const getDashboardStatsApi = async () => {
  const response = await api.get("/dashboard/stats");
  return response.data;
};

export const getVisitorReportApi = async (params = {}) => {
  const response = await api.get("/reports/visitors", { params });
  return response.data;
};

export const getAnalyticsApi = async (params = {}) => {
  const response = await api.get("/reports/analytics", { params });
  return response.data;
};

export const getFilterOptionsApi = async () => {
  const response = await api.get("/reports/filters");
  return response.data;
};

export const getActivityLogsApi = async () => {
  const response = await api.get("/reports/activity-logs");
  return response.data;
};
