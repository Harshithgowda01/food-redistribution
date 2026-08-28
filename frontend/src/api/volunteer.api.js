import api from './axios';

export const getVolunteerProfile = () => api.get('/volunteer/profile');
export const updateVolunteerProfile = (data) => api.put('/volunteer/profile', data);
export const getAvailableRequests = () => api.get('/volunteer/available-requests');
export const acceptDelivery = (id) => api.post(`/volunteer/donations/${id}/accept`);
export const getActiveDelivery = () => api.get('/volunteer/active-delivery');
export const confirmVolunteerPickup = (id) => api.put(`/volunteer/deliveries/${id}/pickup`);
export const confirmVolunteerDelivery = (id) => api.put(`/volunteer/deliveries/${id}/deliver`);
export const getVolunteerHistory = () => api.get('/volunteer/history');
