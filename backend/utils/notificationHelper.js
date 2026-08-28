const Notification = require('../models/Notification.model');

const createNotification = async (recipientId, type, title, message, donationId = null, deliveryId = null) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      type: type,
      title: title,
      message: message,
      relatedDonation: donationId,
      relatedDelivery: deliveryId
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error.message);
  }
};

module.exports = { createNotification };