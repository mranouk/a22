// src/bot/middleware/session.js
const { Telegraf } = require('telegraf')
const session = require('telegraf/session')

// This exports Telegraf's native session middleware.
// All scenes, wizards, and multi-step flows require this!
module.exports = session({
  // Optionally, provide a custom session key generator
  // key: (ctx) => ctx.from && ctx.chat && `${ctx.from.id}:${ctx.chat.id}`
})
