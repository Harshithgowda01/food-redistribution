const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organizationName: {
    type: String,
    trim: true
  },
  donorType: {
    type: String,
    enum: ['restaurant', 'hotel', 'event_organizer', 'individual', 'other'],
    default: 'individual'
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
  totalDonations: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

donorSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Donor', donorSchema);