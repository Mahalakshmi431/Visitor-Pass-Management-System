import api from "./api";

export const createVisitorApi = async (visitorData) => {
  const response = await api.post("/visitors", visitorData);
  return response.data;
};

export const getVisitorsApi = async (params = {}) => {
  const response = await api.get("/visitors", { params });
  return response.data;
};

export const getVisitorByIdApi = async (id) => {
  const response = await api.get(`/visitors/${id}`);
  return response.data;
};

export const updateVisitorApi = async (id, visitorData) => {
  const response = await api.put(`/visitors/${id}`, visitorData);
  return response.data;
};


export const approveVisitorApi = async (id, remarks) => {
  const response = await api.put(`/visitors/${id}/approve`, { remarks });
  return response.data;
};

export const rejectVisitorApi = async (id, remarks) => {
  const response = await api.put(`/visitors/${id}/reject`, { remarks });
  return response.data;
};

export const checkInVisitorApi = async (id) => {
  const response = await api.put(`/visitors/${id}/checkin`);
  return response.data;
};

export const checkOutVisitorApi = async (id) => {
  const response = await api.put(`/visitors/${id}/checkout`);
  return response.data;
};

export const cancelVisitorApi = async (id) => {
  const response = await api.put(`/visitors/${id}/cancel`);
  return response.data;
};
