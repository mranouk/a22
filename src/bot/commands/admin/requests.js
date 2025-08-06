// src/bot/commands/admin/requests.js
const { Markup } = require('telegraf')
const adminService = require('../../../services/adminService')
const db = require('../../../services/db')
const { ROLES } = require('../../../utils/constants')

async function createRequestButtons(requests, entity) {
  return requests.map(req => [
    Markup.button.callback(
      `📝 ${entity === 'role' ? (ROLES.find(r => r.key === req.payload.roleKey)?.emoji || '') : ''}${req.user.username || req.user.tgid} (${req.status})`,
      `SHOW_REQ_${entity.toUpperCase()}_${req.id}`
    )
  ])
}

module.exports = async (ctx) => {
  const data = ctx.callbackQuery?.data
  let type = 'role'
  if (data && data.startsWith('REQUESTS_')) {
    type = data.replace('REQUESTS_', '').toLowerCase()
  }

  // For simplicity, support entity switching by inline buttons
  const requests = await adminService.getPendingRequests(type)

  // Main navigation filters
  const nav = [
    [
      Markup.button.callback('🔑 Roles', 'REQUESTS_ROLE'),
      Markup.button.callback('👤 Profiles', 'REQUESTS_PROFILE'),
      Markup.button.callback('🏪 Listings', 'REQUESTS_LISTING')
    ]
  ]

  // List all pending requests for selected type
  const buttons = await createRequestButtons(requests, type)
  const replyMarkup = Markup.inlineKeyboard([...nav, ...buttons])

  const entityLabel = type.charAt(0).toUpperCase() + type.slice(1)
  await ctx.editMessageText(
    `🗂️ <b>Pending ${entityLabel} Approval Requests:</b>\nSelect a request to approve/reject.\n\n<code>Showing ${requests.length} pending</code>`,
    { parse_mode: 'HTML', reply_markup: replyMarkup.reply_markup }
  )
}
