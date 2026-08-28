const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { getProfile, updateProfile, confirmPickup } = require('../controllers/donor.controller');

router.get('/profile', protect, authorizeRoles('donor'), getProfile);
router.put('/profile', protect, authorizeRoles('donor'), updateProfile);
router.put('/donations/:id/confirm-pickup', protect, authorizeRoles('donor'), confirmPickup);

module.exports = router;
