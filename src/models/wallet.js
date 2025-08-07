// src/models/wallet.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'stars_deposit', 'boost_purchase', 'premium_purchase'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['USD', 'XTR'], // XTR = Telegram Stars
    default: 'USD',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    required: true
  },
  paymentId: String,        // Telegram payment ID
  fromUserId: mongoose.Schema.Types.ObjectId,
  toUserId: mongoose.Schema.Types.ObjectId,
  orderId: String,          // Marketplace order ID
  description: String,
  metadata: Object,         // Additional data
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PendingPaymentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'stars_deposit', 'boost_purchase', 'premium_purchase', 'marketplace_purchase'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['USD', 'XTR'],
    required: true
  },
  payload: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  completedAt: Date,
  cancelledAt: Date
});

const WalletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  starBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  transactions: [TransactionSchema],
  pendingPayments: [PendingPaymentSchema],
  status: {
    type: String,
    enum: ['active', 'suspended', 'frozen'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
WalletSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for total available balance
WalletSchema.virtual('totalBalance').get(function() {
  return this.balance;
});

// Methods
WalletSchema.methods.addTransaction = function(transactionData) {
  this.transactions.push(transactionData);
  return this.save();
};

module.exports = mongoose.model('Wallet', WalletSchema);