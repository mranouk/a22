const { Markup } = require('telegraf')
const approvalHandler = require('../../handlers/approvalHandler')

/**
 * Handles Approve/Reject button presses from admin for role/profile/listing requests.
 * Called via callback queries: e.g., APPROVE_REQ_{type}_{requestId}, REJECT_REQ_{type}_{requestId}
 */
module.exports = async (ctx) => {
  try {
    const data = ctx.callbackQuery.data
    const matches = data.match(/^(APPROVE|REJECT)_REQ_([a-zA-Z]+)_(\w+)$/)
    if (!matches) {
      return ctx.answerCbQuery('⛔️ Invalid action!', { show_alert: true })
    }
    const action = matches[1]
    const reqType = matches[2]
    const reqId = matches[3]
    const adminId = ctx.from.id

    // Process via central approval handler
    if (action === 'APPROVE') {
      await approvalHandler.approveRequest({ reqType, reqId, adminId })
      await ctx.editMessageText(
        `✅ <b>Approved!</b>\nRequest <code>${reqId}</code> has been approved.`,
        { parse_mode: 'HTML' }
      )
      return ctx.answerCbQuery('Approved ✅', { show_alert: false })
    } else {
      // Ask admin for optional rejection reason (in practice, often handled as a wizard or prompt)
      await approvalHandler.rejectRequest({ reqType, reqId, adminId, reason: null }) // Assume null or use alternative scene to collect reason
      await ctx.editMessageText(
        `❌ <b>Rejected!</b>\nRequest <code>${reqId}</code> has been rejected.`,
        { parse_mode: 'HTML' }
      )
      return ctx.answerCbQuery('Rejected ❌', { show_alert: false })
    }
  } catch (err) {
    console.error('ADMIN_APPROVE_ERR', err)
    await ctx.replyWithHTML('⚠️ <b>Error processing approval action.</b>\nPlease try again!')
  }
}
