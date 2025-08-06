// src/bot/commands/profile.js
const db = require('../../services/db')
const { Markup } = require('telegraf')
const { SECTORS, EXPERIENCE_LEVELS, GENDERS } = require('../../utils/constants')

function getLabel(list, key) {
  const item = list.find(x => x.key === key)
  return item ? `${item.emoji} ${item.label}` : key
}

module.exports = async (ctx) => {
  const tgid = ctx.from.id
  const user = await db.User.findOne({ tgid })
  if (!user) {
    return ctx.replyWithHTML('⛔️ Please <b>/start</b> first!')
  }

  const profile = await db.Profile.findOne({ user: user._id })
  if (!profile) {
    return ctx.replyWithHTML(
      `📝 <b>No profile found!</b>\nPlease run /start or /profile to begin onboarding.`
    )
  }

  const sectorStr = getLabel(SECTORS, profile.sector)
  const expStr = getLabel(EXPERIENCE_LEVELS, profile.experience)
  const genderStr = getLabel(GENDERS, profile.gender)

  let profileCard =
    `<b>👤 Profile Card</b>\n` +
    `<b>Sector:</b> ${sectorStr}\n` +
    `<b>Experience:</b> ${expStr}\n` +
    `<b>Gender:</b> ${genderStr}\n` +
    `<b>Age:</b> ${profile.age}\n`

  if (profile.referralCode)
    profileCard += `<b>Referral Code:</b> <code>${profile.referralCode}</code>\n`

  return ctx.replyWithHTML(
    profileCard,
    Markup.inlineKeyboard([
      [Markup.button.callback('✏️ Edit Profile', 'EDIT_PROFILE')],
      // Additional buttons as needed
    ])
  )
}
