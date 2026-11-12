const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notification.controller');

router.get('/', protect, getMyNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);

module.exports = router;