const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  address: {
    type: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      // [longitude, latitude]
      default: [0, 0]
    }
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  vehicleType: {
    type: String,
    enum: ['bicycle', 'motorcycle', 'car', 'van', 'walking', 'other'],
    default: 'other'
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  activeDelivery: {
    // Only one active delivery at a time
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    default: null
  }
}, { timestamps: true });

volunteerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Volunteer', volunteerSchema);