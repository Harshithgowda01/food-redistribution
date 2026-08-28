const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const {
  getProfile,
  updateProfile,
  getIncomingDonations,
  getMyDonations,
  acceptDonation,
  rejectDonation,
  chooseCollectionMethod,
  confirmReceipt,
  switchSelfCollect,
  retryVolunteerSearch
} = require('../controllers/ngo.controller');

router.get('/profile', protect, authorizeRoles('ngo'), getProfile);
router.put('/profile', protect, authorizeRoles('ngo'), updateProfile);
router.get('/incoming-donations', protect, authorizeRoles('ngo'), getIncomingDonations);
router.get('/my-donations', protect, authorizeRoles('ngo'), getMyDonations);
router.put('/donations/:id/accept', protect, authorizeRoles('ngo'), acceptDonation);
router.put('/donations/:id/reject', protect, authorizeRoles('ngo'), rejectDonation);
router.put('/donations/:id/collection-method', protect, authorizeRoles('ngo'), chooseCollectionMethod);
router.put('/donations/:id/confirm-receipt', protect, authorizeRoles('ngo'), confirmReceipt);
router.put('/donations/:id/switch-self-collect', protect, authorizeRoles('ngo'), switchSelfCollect);
router.put('/donations/:id/retry-volunteer', protect, authorizeRoles('ngo'), retryVolunteerSearch);

module.exports = router;
