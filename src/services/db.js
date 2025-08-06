// src/services/db.js
const mongoose = require('mongoose')
const config = require('../config/default.json')

// Import all data models
const User = require('../models/user')
const Profile = require('../models/profile')
const RoleRequest = require('../models/roleRequest')
// Import other models as you create them:
// const Listing = require('../models/listing')
// const Wallet = require('../models/wallet')
// etc.

// Mongoose Connection
mongoose.connect(config.mongoUri, {
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
  // Listing,
  // Wallet,
  // ...etc (add models as you implement them)
}
