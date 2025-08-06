// src/services/walletService.js
const db = require('./db')
const { v4: uuidv4 } = require('uuid')
const cryptoUtils = require('../utils/cryptoUtils')
const notificationService = require('./notificationService')

/**
 * Get wallet by user ID (create if missing).
 */
exports.getOrCreateWallet = async (userId) => {
  let wallet = await db.Wallet.findOne({ user: userId })
  if (!wallet) {
    wallet = await db.Wallet.create({
      id: uuidv4(),
      user: userId,
      cryptoBalances: {},
      transactions: []
    })
  }
  return wallet
}

/**
 * Get crypto balance for a given user/currency.
 */
exports.getBalance = async (userId, currency) => {
  const wallet = await this.getOrCreateWallet(userId)
  return wallet.cryptoBalances[currency] || 0
}

/**
 * Add a deposit (after verifying on-chain payment).
 */
exports.deposit = async (userId, { amount, currency, txid, from }) => {
  // Verify payment exists on-chain, signature/address, etc.
  const verified = await cryptoUtils.verifyDeposit(txid, amount, currency, from)
  if (!verified) throw new Error('Payment not found/verified on blockchain')

  const wallet = await this.getOrCreateWallet(userId)
  wallet.cryptoBalances[currency] = (wallet.cryptoBalances[currency] || 0) + amount
  wallet.transactions.push({
    txid,
    type: 'deposit',
    amount,
    currency,
    status: 'confirmed',
    to: 'user',
    from,
    createdAt: new Date()
  })
  await wallet.save()

  notificationService.sendMessage(
    userId,
    `💰 <b>Deposit confirmed!</b>\n${amount} ${currency} is now in your wallet.`
  )
}

/**
 * Request a withdrawal for a user (admin/manual verification is assumed).
 */
exports.requestWithdrawal = async (userId, { amount, currency, to }) => {
  const wallet = await this.getOrCreateWallet(userId)
  if ((wallet.cryptoBalances[currency] || 0) < amount) throw new Error('Insufficient balance')

  // Deduct pending withdrawal
  wallet.cryptoBalances[currency] -= amount
  wallet.transactions.push({
    type: 'withdrawal',
    amount,
    currency,
    status: 'pending',
    to,
    from: userId.toString(),
    createdAt: new Date()
  })
  await wallet.save()

  notificationService.sendMessage(
    userId,
    `↩️ <b>Withdrawal requested!</b>\n${amount} ${currency} is being processed.`
  )
  // Actual blockchain payout via cryptoUtils.sendWithdrawal() can be queued from admin panel/manual audit.
}

/**
 * Log escrow-related movement (block, release funds, etc).
 */
exports.escrowMovement = async (userId, { amount, currency, escrowId, type }) => {
  const wallet = await this.getOrCreateWallet(userId)
  // For blocking: hold/deduct; for release: add/credit, etc.
  wallet.transactions.push({
    type: 'escrow',
    amount,
    currency,
    status: type,
    meta: { escrowId },
    createdAt: new Date()
  })
  // Balance impact depends on escrow type (block/freeze/finalize); expand as per your business logic
  await wallet.save()
}

/**
 * Get all transactions for a wallet.
 */
exports.getHistory = async (userId, limit = 25) => {
  const wallet = await this.getOrCreateWallet(userId)
  const txs = [...wallet.transactions].reverse().slice(0, limit)
  return txs
}
