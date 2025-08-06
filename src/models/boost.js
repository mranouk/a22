// src/models/boost.js
const mongoose = require('mongoose')

const BoostSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true // UUID
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing'
    // If boosting a profile instead, this can be null
  },
  type: {
    type: String,
    enum: ['profile', 'listing'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'failed'],
    default: 'pending'
  },
  durationHours: {
    type: Number,
    default: 24 // Default boost period
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  logs: [
    {
      at: { type: Date, default: Date.now },
      action: String,
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

module.exports = mongoose.model('Boost', BoostSchema)
