const mongoose = require('mongoose');

const matchingLogSchema = new mongoose.Schema({
  donation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: true
  },
  rankedNGOs: [
    {
      ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      ngoName: { type: String },
      scores: {
        distanceScore: { type: Number },
        compatibilityScore: { type: Number },
        capacityScore: { type: Number },
        urgencyScore: { type: Number },
        availabilityScore: { type: Number },
        totalScore: { type: Number }
      }
    }
  ],
  selectedNGO: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  finalOutcome: {
    type: String,
    enum: ['accepted', 'all_rejected', 'expired', 'no_ngos_available'],
    default: null
  },
  totalNGOsConsidered: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('MatchingLog', matchingLogSchema);