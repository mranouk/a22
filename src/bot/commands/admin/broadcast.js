// src/bot/commands/admin/broadcast.js
const { Markup } = require('telegraf')
const notificationService = require('../../../services/notificationService')
const adminService = require('../../../services/adminService')

// Step 1: Ask admin to enter the message
module.exports = async (ctx) => {
  // Support both entry and step-wise inline scenes (for brevity, single-message input)
  const adminId = ctx.from.id
  let state = ctx.session?.broadcastState || {}

  if (!state.composing) {
    state.composing = true
    ctx.session.broadcastState = state
    return ctx.replyWithHTML(
      `📢 <b>Broadcast!</b>\nPlease enter your announcement message (HTML + emojis supported).`,
      Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Cancel', 'BROADCAST_CANCEL')]
      ])
    )
  }

  // Await admin message for the broadcast content
  if (ctx.message?.text) {
    state.message = ctx.message.text
    ctx.session.broadcastState = state

    // Show preview
    return ctx.replyWithHTML(
      `🔍 <b>Preview:</b>\n\n${state.message}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Send', 'BROADCAST_CONFIRM')],
        [Markup.button.callback('✏️ Edit', 'BROADCAST_EDIT')],
        [Markup.button.callback('⬅️ Cancel', 'BROADCAST_CANCEL')]
      ])
    )
  }

  // Handle inline button actions (confirm, edit, cancel)
  if (ctx.callbackQuery) {
    const act = ctx.callbackQuery.data
    if (act === 'BROADCAST_CONFIRM') {
      // Send to all users (collect from DB or keep a cached user list)
      const users = await adminService.getAllUserTgIds()
      await notificationService.broadcast(users, state.message)
      ctx.session.broadcastState = null
      return ctx.editMessageText('✅ <b>Broadcast sent to all users!</b>', { parse_mode: 'HTML' })
    }
    if (act === 'BROADCAST_EDIT') {
      ctx.session.broadcastState = { composing: true }
      return ctx.replyWithHTML(
        `✏️ <b>Edit your announcement message:</b>`,
        Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Cancel', 'BROADCAST_CANCEL')]
        ])
      )
    }
    if (act === 'BROADCAST_CANCEL') {
      ctx.session.broadcastState = null
      return ctx.editMessageText('⛔️ <b>Broadcast cancelled.</b>', { parse_mode: 'HTML' })
    }
  }
}
