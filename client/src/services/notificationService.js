import api from "./api";

export const getNotificationsApi = async (params = {}) => {
  const response = await api.get("/notifications", { params });
  return response.data;
};

export const getUnreadCountApi = async () => {
  const response = await api.get("/notifications/unread-count");
  return response.data;
};

export const markAsReadApi = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllAsReadApi = async () => {
  const response = await api.put("/notifications/mark-all-read");
  return response.data;
};

export const deleteNotificationApi = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

export const clearAllNotificationsApi = async () => {
  const response = await api.delete("/notifications");
  return response.data;
};

export const getPreferencesApi = async () => {
  const response = await api.get("/notifications/preferences");
  return response.data;
};

export const updatePreferencesApi = async (data) => {
  const response = await api.put("/notifications/preferences", data);
  return response.data;
};
