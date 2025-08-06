// src/models/roleRequest.js
const mongoose = require('mongoose')

const RoleRequestSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true // UUID (as used in approvalHandler and services)
  },
  type: {
    type: String, // 'role', 'profile', or 'listing'
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  payload: {
    type: Object // e.g., requested roleKey, or profile/update data, listing info
  },
  logs: [
    {
      at: { type: Date, default: Date.now },
      action: String,
      meta: Object
    }
  ],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

module.exports = mongoose.model('RoleRequest', RoleRequestSchema)
