import api from './axios';

export const getAdminStats = () => api.get('/admin/stats');
export const getAdminAnalytics = () => api.get('/admin/analytics');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const toggleUserStatus = (id) => api.put(`/admin/users/${id}/toggle-status`);
export const getAdminDonations = (params) => api.get('/admin/donations', { params });
export const getAdminDeliveries = () => api.get('/admin/deliveries');
export const getAdminMapData = () => api.get('/admin/map-data');
export const getDemandPrediction = () => api.get('/admin/demand-prediction');
