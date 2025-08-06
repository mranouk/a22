// src/models/auditLog.js
const mongoose = require('mongoose')

const AuditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId, // e.g., admin or user ID
    ref: 'User',
    required: true
  },
  action: {
    type: String, // e.g., 'approve', 'reject', 'wallet_deposit', etc.
    required: true
  },
  targetType: {
    type: String, // e.g., 'roleRequest', 'profile', 'wallet', etc.
    required: true
  },
  targetId: {
    type: String,
    required: true
  },
  meta: {
    type: Object // any additional data for traceability
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

module.exports = mongoose.model('AuditLog', AuditLogSchema)
