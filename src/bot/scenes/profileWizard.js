// src/bot/scenes/profileWizard.js
const { Scenes, Markup } = require('telegraf')
const db = require('../../services/db')
const { SECTORS, EXPERIENCE_LEVELS, GENDERS } = require('../../utils/constants')
const approvalHandler = require('../handlers/approvalHandler')
const { RESTRICTED_PROFILE_FIELDS } = require('../../utils/constants')

// Step 1: Choose Sector
const stepSector = async (ctx) => {
  await ctx.replyWithHTML(
    '🏢 <b>What is your professional sector?</b>',
    Markup.inlineKeyboard(
      SECTORS.map(s =>
        [Markup.button.callback(`${s.emoji} ${s.label}`, `PW_SECTOR_${s.key}`)]
      )
    )
  )
  // Wait for button press
  return ctx.wizard.next()
}

// Step 2: Choose Experience Level
const stepExperience = async (ctx) => {
  const data = ctx.callbackQuery?.data
  if (data && data.startsWith('PW_SECTOR_')) {
    ctx.wizard.state.sector = data.replace('PW_SECTOR_', '')
  }
  await ctx.replyWithHTML(
    '🧑‍💼 <b>Your level of experience?</b>',
    Markup.inlineKeyboard(
      EXPERIENCE_LEVELS.map(e =>
        [Markup.button.callback(`${e.emoji} ${e.label}`, `PW_EXP_${e.key}`)]
      )
    )
  )
  return ctx.wizard.next()
}

// Step 3: Choose Gender
const stepGender = async (ctx) => {
  const data = ctx.callbackQuery?.data
  if (data && data.startsWith('PW_EXP_')) {
    ctx.wizard.state.experience = data.replace('PW_EXP_', '')
  }
  await ctx.replyWithHTML(
    '💁 <b>Your gender?</b>',
    Markup.inlineKeyboard(
      GENDERS.map(g =>
        [Markup.button.callback(`${g.emoji} ${g.label}`, `PW_GENDER_${g.key}`)]
      )
    )
  )
  return ctx.wizard.next()
}

// Step 4: Enter Age
const stepAge = async (ctx) => {
  const data = ctx.callbackQuery?.data
  if (data && data.startsWith('PW_GENDER_')) {
    ctx.wizard.state.gender = data.replace('PW_GENDER_', '')
  }
  await ctx.replyWithHTML('🎂 <b>Your age?</b>\nPlease reply with a number.')
  ctx.wizard.next()
}

// Step 5: Save profile to DB
const stepSave = async (ctx) => {
  let age = parseInt(ctx.message?.text, 10)
  if (!age || age < 13 || age > 100) {
    await ctx.replyWithHTML('⛔️ Enter a valid age (13-100).')
    return // Stay in this step
  }
  ctx.wizard.state.age = age

  // Save profile in DB
  const user = await db.User.findOne({ tgid: ctx.from.id })
  if (!user) {
    await ctx.replyWithHTML('⛔️ User not found. Please /start again.')
    return ctx.scene.leave()
  }

  let profile = await db.Profile.findOne({ user: user._id })
  if (!profile) profile = new db.Profile({ user: user._id })

  // Check for restricted field changes
  let restrictedChanged = false
  for (const field of RESTRICTED_PROFILE_FIELDS) {
    if (profile[field] && profile[field] !== ctx.wizard.state[field]) {
      restrictedChanged = true
      break
    }
  }

  if (restrictedChanged) {
    // Route to approvalHandler for admin approval
    await approvalHandler.sendProfileApprovalRequest({
      userId: user._id,
      username: user.username,
      changes: {
        sector: ctx.wizard.state.sector,
        experience: ctx.wizard.state.experience,
        gender: ctx.wizard.state.gender,
        age: ctx.wizard.state.age
      }
    })
    await ctx.replyWithHTML('⏳ <b>Waiting for admin approval!</b>\nYour profile changes will be applied after review.')
    return ctx.scene.leave()
  }

  profile.sector = ctx.wizard.state.sector
  profile.experience = ctx.wizard.state.experience
  profile.gender = ctx.wizard.state.gender
  profile.age = ctx.wizard.state.age
  await profile.save()

  await ctx.replyWithHTML(
    `✅ <b>Profile completed!</b>\n` +
    `Admins can now approve your role request (if not done already).`
  )
  // Suggest next steps
  await ctx.replyWithHTML(
    'You can /profile to view or edit your info at any time.'
  )

  return ctx.scene.leave()
}

const profileWizard = new Scenes.WizardScene(
  'profileWizard',
  stepSector,
  stepExperience,
  stepGender,
  stepAge,
  stepSave
)

module.exports = profileWizard
