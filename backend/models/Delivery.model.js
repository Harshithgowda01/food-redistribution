const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  donation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: true
  },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  volunteerProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volunteer',
    required: true
  },
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Locations
  pickupAddress: {
    type: String,
    required: true
  },
  pickupCoordinates: {
    type: [Number],
    default: [0, 0]
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryCoordinates: {
    type: [Number],
    default: [0, 0]
  },

  // Distance and ETA Tracking
  distanceKm: {
    type: Number,
    default: 0
  },
  estimatedDeliveryMinutes: {
    type: Number,
    default: 0
  },
  estimatedDeliveryTime: {
    type: Date,
    default: null
  },
  arrivalNotified: {
    // True when 2-minute arrival warning notification has been sent to NGO
    type: Boolean,
    default: false
  },

  // Confirmations
  volunteerConfirmedPickup: {
    type: Boolean,
    default: false
  },
  donorConfirmedPickup: {
    type: Boolean,
    default: false
  },
  volunteerConfirmedDelivery: {
    type: Boolean,
    default: false
  },
  ngoConfirmedReceipt: {
    type: Boolean,
    default: false
  },

  // Status
  status: {
    type: String,
    enum: [
      'ASSIGNED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
      'COMPLETED'
    ],
    default: 'ASSIGNED'
  },

  // Volunteers notified for this delivery
  notifiedVolunteers: [
    {
      volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      notifiedAt: { type: Date },
      responded: { type: Boolean, default: false },
      accepted: { type: Boolean, default: false }
    }
  ],

  // Timestamps
  assignedAt: { type: Date, default: Date.now },
  pickedUpAt: { type: Date },
  deliveredAt: { type: Date },
  completedAt: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);