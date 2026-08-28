const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      // Donor notifications
      'DONATION_POSTED',
      'NGO_MATCHED',
      'NGO_ACCEPTED',
      'NGO_REJECTED',
      'VOLUNTEER_ASSIGNED',
      'FOOD_COLLECTED',
      'DONATION_COMPLETED',
      'DONATION_CANCELLED',
      'NO_NGO_FOUND',

      // NGO notifications
      'NEW_DONATION_AVAILABLE',
      'VOLUNTEER_FOUND',
      'NO_VOLUNTEER_AVAILABLE',
      'DELIVERY_COMPLETED',
      'NGO_SELF_COLLECTING',
      'VOLUNTEER_REQUESTED',

      // Volunteer notifications
      'NEW_DELIVERY_REQUEST',
      'DELIVERY_ASSIGNED',
      'DELIVERY_TAKEN',

      // General
      'SYSTEM'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedDonation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    default: null
  },
  relatedDelivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
