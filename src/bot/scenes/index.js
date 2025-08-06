// src/bot/scenes/index.js
const { Scenes } = require('telegraf')

// Import all step-based scenes and wizards here
const profileWizard = require('./profileWizard')
// If you have additional scenes, import as needed:
// const onboardingWizard = require('./onboardingWizard')
// const approvalScene = require('./approvalScene')

const stage = new Scenes.Stage([
  profileWizard
  // onboardingWizard,
  // approvalScene,
  // ...add all scenes here
])

module.exports = stage
