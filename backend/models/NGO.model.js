const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organizationName: {
    type: String,
    required: true,
    trim: true
  },
  registrationNumber: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    default: ''
  },
  location: {
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
  capacity: {
    type: Number,
    default: 100
  },
  foodPreferences: {
    type: [String],
    enum: ['cooked_meals', 'raw_vegetables', 'fruits', 'bakery', 'dairy', 'packaged', 'any'],
    default: ['any']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  availabilitySchedule: {
    type: String,
    default: 'Always available'
  },
  totalReceived: {
    type: Number,
    default: 0
  },
  description: {
    type: String
  }
}, { timestamps: true });

ngoSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('NGO', ngoSchema);