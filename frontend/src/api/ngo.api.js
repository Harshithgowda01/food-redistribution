import api from './axios';

export const getNGOProfile = () => api.get('/ngo/profile');
export const updateNGOProfile = (data) => api.put('/ngo/profile', data);
export const getIncomingDonations = () => api.get('/ngo/incoming-donations');
export const getMyNGODonations = () => api.get('/ngo/my-donations');
export const acceptDonation = (id) => api.put(`/ngo/donations/${id}/accept`);
export const rejectDonation = (id) => api.put(`/ngo/donations/${id}/reject`);
export const chooseCollectionMethod = (id, data) => api.put(`/ngo/donations/${id}/collection-method`, data);
export const confirmNGOReceipt = (id) => api.put(`/ngo/donations/${id}/confirm-receipt`);
export const switchSelfCollect = (id) => api.put(`/ngo/donations/${id}/switch-self-collect`);
export const retryVolunteerSearch = (id) => api.put(`/ngo/donations/${id}/retry-volunteer`);
export const volunteerTimeoutAction = (id, action, reason = '') => api.post(`/ngo/donations/${id}/volunteer-timeout-action`, { action, reason });
