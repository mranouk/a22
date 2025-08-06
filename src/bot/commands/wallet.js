// src/bot/commands/wallet.js
const walletService = require('../../services/walletService')
const db = require('../../services/db')
const { Markup } = require('telegraf')

module.exports = async (ctx) => {
  const tgid = ctx.from.id
  const user = await db.User.findOne({ tgid })
  if (!user) {
    return ctx.replyWithHTML('⛔️ Please <b>/start</b> first!')
  }

  // Get or create user's wallet
  const wallet = await walletService.getOrCreateWallet(user._id)
  const balances = wallet.cryptoBalances || {}

  let balanceStr = Object.keys(balances).length
    ? Object.entries(balances)
        .map(([cur, amt]) => `• <b>${amt}</b> <code>${cur}</code>`)
        .join('\n')
    : '— <i>Empty</i> —'

  let txs = wallet.transactions.slice(-10).reverse()
  let txStr = txs.length
    ? txs
        .map(
          (tx) =>
            `${
              tx.type === 'deposit'
                ? '➕'
                : tx.type === 'withdrawal'
                ? '➖'
                : '🔄'
            } <b>${tx.amount}</b> <code>${tx.currency}</code> <i>${tx.type}</i> (${tx.status})`
        )
        .join('\n')
    : '<i>No recent transactions.</i>'

  return ctx.replyWithHTML(
    `👛 <b>Your Wallet</b>\n\n<b>Balances:</b>\n${balanceStr}\n\n<b>Recent Activity:</b>\n${txStr}`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ Deposit', 'WALLET_DEPOSIT'),
        Markup.button.callback('➖ Withdraw', 'WALLET_WITHDRAW')
      ],
      [Markup.button.callback('🔄 Refresh', 'WALLET_REFRESH')]
    ])
  )
}
