const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const {
  getStats,
  getAnalytics,
  getUsers,
  toggleUserStatus,
  getDonations,
  getDeliveries,
  getMapData,
  getDemandPrediction
} = require('../controllers/admin.controller');

// All admin routes are protected and role-restricted to 'admin'
router.get('/stats', protect, authorizeRoles('admin'), getStats);
router.get('/analytics', protect, authorizeRoles('admin'), getAnalytics);
router.get('/users', protect, authorizeRoles('admin'), getUsers);
router.put('/users/:id/toggle-status', protect, authorizeRoles('admin'), toggleUserStatus);
router.get('/donations', protect, authorizeRoles('admin'), getDonations);
router.get('/deliveries', protect, authorizeRoles('admin'), getDeliveries);
router.get('/map-data', protect, authorizeRoles('admin'), getMapData);
router.get('/demand-prediction', protect, authorizeRoles('admin'), getDemandPrediction);

module.exports = router;