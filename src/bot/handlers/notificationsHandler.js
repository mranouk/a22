// src/bot/handlers/notificationsHandler.js
const notificationService = require('../../services/notificationService')
const { Markup } = require('telegraf')

/**
 * Queue and send any system/user/admin notification.
 * @param {Number} tgid - Telegram user ID
 * @param {String} html - HTML notification content (with emojis)
 * @param {Object} options - Optional { buttons, fallback, replyTo }
 */
exports.send = async (tgid, html, options = {}) => {
  try {
    await notificationService.sendMessage(
      tgid,
      html,
      options.buttons ? { reply_markup: Markup.inlineKeyboard(options.buttons), ...options } : options
    )
  } catch (err) {
    // Always provide UI fallback for failed delivery/callback errors
    try {
      await notificationService.sendMessage(
        tgid,
        '⚠️ <b>Notification failed or is outdated.</b>\n⛔️ Sorry, this option is no longer available!',
        { parse_mode: 'HTML' }
      )
    } catch (err2) {
      // Swallow further errors to avoid spamming logs
    }
  }
}

/**
 * Specialized functions for common notification types.
 */
exports.info = (tgid, message) =>
  this.send(tgid, `ℹ️ <b>Info:</b> ${message}`)

exports.success = (tgid, message) =>
  this.send(tgid, `✅ <b>Success:</b> ${message}`)

exports.error = (tgid, message) =>
  this.send(tgid, `⛔️ <b>Error:</b> ${message}`)

exports.announcement = async (tgids, html, extraButtons) => {
  for (const id of tgids) {
    await this.send(id, `📢 <b>Announcement</b>\n${html}`, {
      buttons: extraButtons
    })
  }
}
