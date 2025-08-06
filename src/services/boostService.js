// src/services/boostService.js
const db = require('./db')
const { v4: uuidv4 } = require('uuid')
const notificationService = require('./notificationService')
const { BOOST_PRICE, BOOST_DURATION_HOURS } = require('../utils/constants')
const walletService = require('./walletService')

/**
 * Purchase a new boost (profile or listing).
 * @param {ObjectId} userId
 * @param {String} type - 'profile' or 'listing'
 * @param {ObjectId} [listingId] - required if boosting a listing
 * @returns {Promise<String>} boostId
 */
exports.purchaseBoost = async (userId, type, listingId = null) => {
  // Deduct boost price from wallet
  await walletService.requestWithdrawal(userId, {
    amount: BOOST_PRICE,
    currency: 'USDT',
    to: 'system-boost'
  })

  const id = uuidv4()
  const boost = await db.Boost.create({
    id,
    user: userId,
    listing: type === 'listing' ? listingId : null,
    type,
    status: 'active',
    durationHours: BOOST_DURATION_HOURS,
    startedAt: new Date(),
    endedAt: new Date(Date.now() + BOOST_DURATION_HOURS * 60 * 60 * 1000),
    logs: [{ at: new Date(), action: 'purchased', meta: { type, listingId } }]
  })

  // Update the listing as boosted if applicable
  if (type === 'listing' && listingId) {
    await db.Listing.updateOne({ _id: listingId }, { $set: { boosted: true } })
  }

  notificationService.sendMessage(
    userId,
    `⭐️ <b>You’re boosted!</b>\nYour ${type === 'profile' ? 'profile' : 'listing'} is now promoted for ${BOOST_DURATION_HOURS} hours!`
  )

  return id
}

/**
 * Expire a boost (called by periodic scheduler/cron job or after duration).
 */
exports.expireBoost = async (boostId) => {
  const boost = await db.Boost.findOne({ id: boostId })
  if (!boost) return
  boost.status = 'expired'
  boost.endedAt = new Date()
  await boost.save()

  if (boost.type === 'listing' && boost.listing) {
    await db.Listing.updateOne({ _id: boost.listing }, { $set: { boosted: false } })
  }

  notificationService.sendMessage(
    boost.user,
    `⏳ <b>Your boost has expired.</b>`
  )
}

/**
 * Get analytics for a user's boosts.
 */
exports.getBoostHistory = async (userId, limit = 10) => {
  return db.Boost.find({ user: userId })
    .sort({ startedAt: -1 })
    .limit(limit)
}

/**
 * Get active boosts (for admin or UI highlighting).
 */
exports.getActiveBoosts = async () => {
  return db.Boost.find({ status: 'active', endedAt: { $gte: new Date() } })
}
