// src/bot/commands/trust.js
const trustScoreService = require('../../services/trustScoreService')
const { Markup } = require('telegraf')
const db = require('../../services/db')
const { BADGE_TYPES } = require('../../utils/constants')

module.exports = async (ctx) => {
  const userId = ctx.from.id
  // Find user object
  const userDoc = await db.User.findOne({ tgid: userId })
  if (!userDoc) {
    return ctx.replyWithHTML('⛔️ Please /start first.')
  }

  // Get current trust info
  const trust = await trustScoreService.getTrustInfo(userDoc._id)
  let history = ''
  if (trust.history && trust.history.length) {
    history = trust.history.map(h =>
      `${h.delta > 0 ? '➕' : '➖'}${h.delta} (${h.action})`
    ).join('\n')
  } else {
    history = 'No history yet.'
  }

  // Optionally: Top leaderboard of users by trust (top 5)
  const top = await db.TrustScore.find({})
    .sort({ score: -1 })
    .limit(5)
    .populate('user')
  let leaderboard =
    top.length > 1
      ? '\n\n<b>Top Users:</b>\n' +
        top
          .map((ts, i) =>
            `${i + 1}. ${BADGE_TYPES[ts.badgeLevel].emoji} @${ts.user.username || ts.user.tgid} — <b>${ts.score}</b>`
          )
          .join('\n')
      : ''

  return ctx.replyWithHTML(
    `${trust.emoji} <b>Your Trust Score:</b> <b>${trust.score}</b>\n<b>Badge:</b> ${trust.badge.toUpperCase()}\n\n<b>Recent History:</b>\n${history}${leaderboard}`,
    Markup.inlineKeyboard([[Markup.button.callback('🔄 Refresh', 'TRUST_REFRESH')]])
  )
}
