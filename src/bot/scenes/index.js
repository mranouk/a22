// src/bot/scenes/index.js
const { Scenes } = require('telegraf')

// Import all step-based scenes and wizards here
const profileWizard = require('./profileWizard')
const listingWizard = require('./listingWizard')
const walletWizard = require('./walletWizard')

const stage = new Scenes.Stage([
  profileWizard,
  listingWizard,
  walletWizard
])

module.exports = stage
