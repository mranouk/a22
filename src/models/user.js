const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  tgid: {
    type: Number, // Telegram User ID
    required: true,
    unique: true
  },
  username: {
    type: String
  },
  role: {
    type: String // E.g., 'buyer', 'vendor', etc.
  },
  trust: {
    type: Number,
    default: 0 // For Trust Score/Levels
  },
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Reference to referrer, if any
  },
  isAdmin: {
    type: Boolean,
    default: false
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

// Optional: index for fast lookup by telegram id
UserSchema.index({ tgid: 1 })

module.exports = mongoose.model('User', UserSchema)
