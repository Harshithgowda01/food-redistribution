import api from './axios';

export const getDonorProfile = () => api.get('/donor/profile');
export const updateDonorProfile = (data) => api.put('/donor/profile', data);
export const confirmDonorPickup = (donationId) => api.put(`/donor/donations/${donationId}/confirm-pickup`);