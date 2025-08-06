// src/models/listing.js
const mongoose = require('mongoose')

const ListingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true // UUID
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  details: {
    type: String,
    required: true // Markdown/HTML-formatted or plain description
  },
  category: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    default: false // Becomes true after admin approval or auto-moderation
  },
  boosted: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
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

module.exports = mongoose.model('Listing', ListingSchema)
