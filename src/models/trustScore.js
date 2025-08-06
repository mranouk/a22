// src/models/trustScore.js
const mongoose = require('mongoose')

const TrustScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  score: {
    type: Number,
    default: 0
  },
  badgeLevel: {
    type: String, // e.g., 'bronze', 'silver', 'gold'
    default: 'bronze'
  },
  history: [
    {
      at: { type: Date, default: Date.now },
      delta: Number,
      action: String, // e.g., 'deal_completed', 'dispute_resolved'
      meta: Object
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

module.exports = mongoose.model('TrustScore', TrustScoreSchema)
