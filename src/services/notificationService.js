// src/services/notificationService.js
const Telegraf = require('telegraf')
const config = require('../config/default.json')

// Make sure you initialize and export a singleton bot instance
// const bot = require('../botInstance') // Assume this module exports your single Telegraf instance

/**
 * Send a message to a given Telegram user ID with HTML parse and emoji.
 * @param {Number} tgid - Telegram ID
 * @param {String} html - HTML message
 * @param {Object} [extra] - Extra options (e.g., inlineKeyboard, etc.)
 */
exports.sendMessage = async (tgid, html, extra) => {
  try {
    await bot.telegram.sendMessage(tgid, html, { parse_mode: 'HTML', ...extra })
  } catch (err) {
    console.error(`❌ Failed to send message to ${tgid}:`, err)
  }
}

/**
 * Send a broadcast message to multiple Telegram users (admins or all users).
 * @param {Array<Number>} tgids
 * @param {String} html
 * @param {Object} [extra]
 */
exports.broadcast = async (tgids, html, extra) => {
  await Promise.all(
    tgids.map(id => this.sendMessage(id, html, extra))
  )
}

/**
 * Optionally: Queue or schedule a notification for later.
 * For now: just calls sendMessage immediately.
 */
exports.queueNotification = async (tgid, html, extra) => {
  await this.sendMessage(tgid, html, extra)
}
