// src/bot/commands/start.js
const { Markup } = require('telegraf')
const userService = require('../../services/userService')
const { ROLES } = require('../../utils/constants')

module.exports = async (ctx) => {
  try {
    // Telegram: every user has ctx.from.{id, username}
    const userId = ctx.from.id
    const username = ctx.from.username

    // Ensure user exists in DB (placeholder profile is fine at this step)
    await userService.ensureOnboarded(userId, username)

    // Show onboarding/role selection every time for new user, or if rejoining
    await ctx.replyWithHTML(
      `🎉 <b>Welcome to the Marketplace Bot!</b>\n\n` +
      `Ready to join? First, <b>choose your role</b> to get started:\n\n` +
      `<i>(Your role controls what you can do. You can always request a change later.)</i>`,
      Markup.inlineKeyboard(
        ROLES.map(r =>
          [Markup.button.callback(`${r.emoji} ${r.label}`, `ROLE_SELECT_${r.key}`)]
        )
      )
    )
  } catch (err) {
    console.error('START_ERR', err)
    await ctx.replyWithHTML('⛔️ <b>Something went wrong!</b>\nPlease try again later.')
  }
}
