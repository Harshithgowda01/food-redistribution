const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const {
  getProfile,
  updateProfile,
  getAvailableRequests,
  acceptDelivery,
  getActiveDelivery,
  confirmPickup,
  confirmDelivery,
  getDeliveryHistory
} = require('../controllers/volunteer.controller');

// All volunteer routes are protected and role-restricted to 'volunteer'
router.get('/profile', protect, authorizeRoles('volunteer'), getProfile);
router.put('/profile', protect, authorizeRoles('volunteer'), updateProfile);
router.get('/available-requests', protect, authorizeRoles('volunteer'), getAvailableRequests);
router.post('/donations/:id/accept', protect, authorizeRoles('volunteer'), acceptDelivery);
router.get('/active-delivery', protect, authorizeRoles('volunteer'), getActiveDelivery);
router.put('/deliveries/:id/pickup', protect, authorizeRoles('volunteer'), confirmPickup);
router.put('/deliveries/:id/deliver', protect, authorizeRoles('volunteer'), confirmDelivery);
router.get('/history', protect, authorizeRoles('volunteer'), getDeliveryHistory);

module.exports = router;