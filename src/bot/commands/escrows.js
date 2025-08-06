// src/bot/commands/escrows.js
const escrowService = require('../../services/escrowService')
const db = require('../../services/db')
const { Markup } = require('telegraf')

function getStatusEmoji(status) {
  switch (status) {
    case 'funded':
      return '💵'
    case 'confirmed':
      return '✅'
    case 'released':
      return '🏁'
    case 'disputed':
      return '⚠️'
    case 'resolved':
      return '🛡️'
    case 'cancelled':
      return '❌'
    default:
      return '🔜'
  }
}

module.exports = async (ctx) => {
  const tgid = ctx.from.id
  const user = await db.User.findOne({ tgid })
  if (!user) {
    return ctx.replyWithHTML('⛔️ Please <b>/start</b> first!')
  }

  const escrows = await escrowService.getEscrowsForUser(user._id)
  if (!escrows.length) {
    return ctx.replyWithHTML('🛡️ <b>No escrow deals found.</b>')
  }

  let text =
    '🛡️ <b>Your Escrowed Deals</b>\n\n' +
    escrows
      .map((escrow, i) => {
        const listing = escrow.listing
        return (
          `${i + 1}. ${getStatusEmoji(escrow.status)} <b>${escrow.status.toUpperCase()}</b> — <b>${escrow.amount} ${escrow.currency}</b>\n` +
          (listing
            ? `<b>Listing:</b> ${listing.details.slice(0, 45)}${listing.details.length > 45 ? '...' : ''}\n`
            : '') +
          `<b>Buyer:</b> ${escrow.buyer.username || escrow.buyer.tgid}\n<b>Seller:</b> ${escrow.seller.username || escrow.seller.tgid}\n<code>ID: ${escrow.id}</code>\n`
        )
      })
      .join('\n')

  // Actions: Show details, refresh
  return ctx.replyWithHTML(
    text,
    Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', 'ESCROW_REFRESH')],
      // Additional row for view details per-deal if needed.
    ])
  )
}
