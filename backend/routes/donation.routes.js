const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const {
  createDonation,
  getMyDonations,
  getDonationById,
  cancelDonation
} = require('../controllers/donation.controller');

router.post('/', protect, authorizeRoles('donor'), createDonation);
router.get('/my', protect, authorizeRoles('donor'), getMyDonations);
router.get('/:id', protect, getDonationById);
router.put('/:id/cancel', protect, cancelDonation);

module.exports = router;