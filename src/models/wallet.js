// src/models/wallet.js
const mongoose = require('mongoose')

const TransactionSchema = new mongoose.Schema({
  txid: String,          // Blockchain transaction ID, if on-chain
  type: {                // deposit, withdrawal, escrow, etc.
    type: String,
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
    enum: ['pending', 'confirmed', 'failed'],
    required: true
  },
  to: String,            // Target address or user
  from: String,          // Source address or user
  meta: Object,          // Any extra info (escrow ID, notes, etc.)
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const WalletSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  cryptoBalances: {
    // Each key is a currency code, e.g., { BTC: 0.1, ETH: 3.5 }
    type: Object,
    default: {}
  },
  transactions: [TransactionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

module.exports = mongoose.model('Wallet', WalletSchema)
