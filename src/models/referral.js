// src/models/referral.js
const mongoose = require('mongoose')

const ReferralSchema = new mongoose.Schema({
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Each invitee can only have one inviter
  },
  status: {
    type: String,
    enum: ['pending', 'joined', 'bonus_paid'],
    default: 'pending'
  },
  bonus: {
    type: Number,
    default: 0
  },
  bonusTxId: String, // Reference to wallet tx if paid out
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

module.exports = mongoose.model('Referral', ReferralSchema)
