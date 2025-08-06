// src/services/trustScoreService.js
const db = require('./db')
const notificationService = require('./notificationService')
const { BADGE_TYPES } = require('../utils/constants')

/**
 * Get or initialize a trust score for a user.
 */
exports.getOrCreateTrustScore = async (userId) => {
  let ts = await db.TrustScore.findOne({ user: userId })
  if (!ts) {
    ts = await db.TrustScore.create({ user: userId, score: 0, badgeLevel: 'bronze', history: [] })
  }
  return ts
}

/**
 * Add (or subtract) score for user, update badge if thresholds passed, log every event.
 */
exports.changeScore = async (userId, delta, action, meta = {}) => {
  const ts = await this.getOrCreateTrustScore(userId)
  ts.score += delta

  // Badge leveling logic (expand logic as needed)
  let newBadge = ts.badgeLevel
  if (ts.score >= 100) {
    newBadge = 'gold'
  } else if (ts.score >= 50) {
    newBadge = 'silver'
  } else {
    newBadge = 'bronze'
  }

  // Log history
  ts.history.push({ at: new Date(), delta, action, meta })
  const badgeChanged = newBadge !== ts.badgeLevel

  ts.badgeLevel = newBadge
  await ts.save()

  // Notify user on badge upgrades
  if (badgeChanged) {
    notificationService.sendMessage(
      userId,
      `${BADGE_TYPES[newBadge].emoji} <b>Congratulations!</b>\nYour badge is now <b>${newBadge.toUpperCase()}</b>!`
    )
  }
}

/**
 * Get current trust and badge info for UI.
 */
exports.getTrustInfo = async (userId) => {
  const ts = await this.getOrCreateTrustScore(userId)
  return {
    score: ts.score,
    badge: ts.badgeLevel,
    emoji: BADGE_TYPES[ts.badgeLevel].emoji,
    history: [...ts.history].reverse().slice(0, 10)
  }
}
