const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  donorProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true
  },

  // Food details
  foodType: {
    type: String,
    enum: ['cooked_meals', 'raw_vegetables', 'fruits', 'bakery', 'dairy', 'packaged', 'other'],
    required: true
  },
  foodName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true
  },
  quantityUnit: {
    type: String,
    enum: ['kg', 'meals', 'litres', 'pieces', 'boxes'],
    default: 'meals'
  },
  description: {
    type: String
  },
  expiryTime: {
    // Exact datetime when food expires
    type: Date,
    required: true
  },

  // Pickup location (donor's location at time of posting)
  pickupAddress: {
    type: String,
    required: true
  },
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },

  // Status tracking
  status: {
    type: String,
    enum: [
      'POSTED',
      'MATCHING',
      'WAITING_FOR_NGO',
      'NGO_ACCEPTED',
      'NGO_COLLECTING',
      'VOLUNTEER_REQUESTED',
      'VOLUNTEER_ASSIGNED',
      'FOOD_COLLECTED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
      'UNMATCHED'
    ],
    default: 'POSTED'
  },

  // NGO matching
  matchedNGO: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  matchedNGOProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGO',
    default: null
  },

  // Fallback system — ranked list from AI
  ngoRankedList: [
    {
      ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      ngoProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO' },
      score: { type: Number },
      status: {
        type: String,
        enum: ['pending', 'notified', 'accepted', 'rejected', 'timeout'],
        default: 'pending'
      },
      notifiedAt: { type: Date },
      respondedAt: { type: Date }
    }
  ],
  currentNGOIndex: {
    // Which NGO in the ranked list are we currently waiting for
    type: Number,
    default: 0
  },

  // Volunteer
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedVolunteerProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volunteer',
    default: null
  },

  // Delivery address (NGO can set custom address)
  deliveryAddress: {
    type: String,
    default: null
  },
  deliveryAddressType: {
    type: String,
    enum: ['registered', 'custom', 'map_pin'],
    default: null
  },
  deliveryLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  collectionMethod: {
    type: String,
    enum: ['self_collect', 'volunteer'],
    default: null
  },
  volunteerRequestedAt: {
    type: Date,
    default: null
  },
  volunteerSearchTimedOut: {
    type: Boolean,
    default: false
  },

  // Confirmation flags
  donorConfirmedCollection: {
    type: Boolean,
    default: false
  },
  ngoConfirmedReceipt: {
    type: Boolean,
    default: false
  },
  volunteerConfirmedPickup: {
    type: Boolean,
    default: false
  },
  volunteerConfirmedDelivery: {
    type: Boolean,
    default: false
  },

  // Timestamps for key events
  matchedAt: { type: Date },
  acceptedAt: { type: Date },
  collectedAt: { type: Date },
  deliveredAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelledBy: { type: String },
  cancellationReason: { type: String }

}, { timestamps: true });

donationSchema.index({ pickupLocation: '2dsphere' });
donationSchema.index({ status: 1 });
donationSchema.index({ donor: 1 });

module.exports = mongoose.model('Donation', donationSchema);
