// src/services/referralService.js
const db = require('./db')
const notificationService = require('./notificationService')
const walletService = require('./walletService')

/**
 * Record a new referral when an invitee joins.
 * @param {ObjectId} inviterId
 * @param {ObjectId} inviteeId
 */
exports.createReferral = async (inviterId, inviteeId) => {
  // Prevent self-referral and duplicates
  if (inviterId.toString() === inviteeId.toString()) return
  const existing = await db.Referral.findOne({ invitee: inviteeId })
  if (existing) return
  await db.Referral.create({
    inviter: inviterId,
    invitee: inviteeId,
    status: 'joined'
  })
}

/**
 * Return referral stats for a user.
 */
exports.getReferralStats = async (userId) => {
  const invites = await db.Referral.find({ inviter: userId })
  const bonusPaid = invites.filter(x => x.status === 'bonus_paid').length
  return {
    total: invites.length,
    joined: invites.filter(x => x.status === 'joined' || x.status === 'bonus_paid').length,
    bonusPaid: bonusPaid
  }
}

/**
 * Pay referral bonus to inviter if invitee completes required action.
 * @param {ObjectId} inviteeId
 * @param {Number} bonusAmount
 * @param {String} currency
 */
exports.payBonus = async (inviteeId, bonusAmount, currency = 'USDT') => {
  const referral = await db.Referral.findOne({ invitee: inviteeId, status: 'joined' }).populate('inviter')
  if (!referral) return

  // Credit inviter's wallet
  await walletService.deposit(referral.inviter._id, {
    amount: bonusAmount,
    currency,
    txid: null,
    from: 'system'
  })
  referral.status = 'bonus_paid'
  referral.bonus = bonusAmount
  await referral.save()

  // Notify inviter
  notificationService.sendMessage(
    referral.inviter.tgid,
    `🎁 <b>Referral Bonus!</b>\nYou earned ${bonusAmount} ${currency} for inviting a friend!`
  )
}

/**
 * Used by referral UI to build user's referral code/link.
 */
exports.getReferralCodeOrLink = (user) => {
  // You can generate a code using the user's Telegram ID, username, or a UUID
  return `REF${user.tgid}`
}
