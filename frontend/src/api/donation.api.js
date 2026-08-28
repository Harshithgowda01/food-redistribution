import api from './axios';

export const createDonation = (data) => api.post('/donations', data);
export const getMyDonations = () => api.get('/donations/my');
export const getDonationById = (id) => api.get(`/donations/${id}`);
export const cancelDonation = (id, reason) => api.put(`/donations/${id}/cancel`, { reason });