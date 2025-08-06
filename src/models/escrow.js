// src/models/escrow.js
const mongoose = require('mongoose')

const EscrowSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['created', 'funded', 'confirmed', 'released', 'disputed', 'resolved', 'cancelled'],
    default: 'created'
  },
  stages: [
    {
      at: { type: Date, default: Date.now },
      action: String, // E.g. 'buyer_funded', 'seller_confirmed', 'admin_released'
      actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      meta: Object
    }
  ],
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

module.exports = mongoose.model('Escrow', EscrowSchema)
