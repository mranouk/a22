// src/services/db.js
const mongoose = require('mongoose')

// Import all data models
const User = require('../models/user')
const Profile = require('../models/profile')
const RoleRequest = require('../models/roleRequest')
const Listing = require('../models/listing')
const Wallet = require('../models/wallet')
const TrustScore = require('../models/trustScore')

// Mongoose Connection using .env variable
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB Connected')
})

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err)
})

// Optionally, export a singleton pool if you want direct driver queries too

module.exports = {
  mongoose,
  User,
  Profile,
  RoleRequest,
  Listing,
  Wallet,
  TrustScore,
  Escrow
}