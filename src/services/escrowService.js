// src/services/escrowService.js
const db = require('./db')
const { v4: uuidv4 } = require('uuid')
const notificationService = require('./notificationService')

/**
 * Initiate a new escrow deal.
 * @param {ObjectId} buyerId
 * @param {ObjectId} sellerId
 * @param {ObjectId} listingId
 * @param {Number} amount
 * @param {String} currency
 * @returns {Promise<String>} escrowId
 */
exports.createEscrow = async (buyerId, sellerId, listingId, amount, currency) => {
  const id = uuidv4()
  await db.Escrow.create({
    id,
    buyer: buyerId,
    seller: sellerId,
    listing: listingId,
    amount,
    currency,
    status: 'created',
    stages: [{ at: new Date(), action: 'created', actor: buyerId }],
    logs: []
  })
  // Notify both parties
  notificationService.sendMessage(
    sellerId,
    `🛡️ <b>New Escrow Created</b>\nA buyer started a deal for your listing. Please check your escrow dashboard.`
  )
  notificationService.sendMessage(
    buyerId,
    `🛡️ <b>Escrow process started!</b>\nYour payment is required to proceed. Follow on-screen steps to fund the escrow.`
  )
  return id
}

/**
 * Update escrow status (for every deal step).
 * @param {String} escrowId
 * @param {String} action
 * @param {ObjectId} actorId
 * @param {Object} meta
 * @returns {Promise<void>}
 */
exports.advanceEscrowStage = async (escrowId, action, actorId, meta = {}) => {
  const escrow = await db.Escrow.findOne({ id: escrowId })
  if (!escrow) throw new Error('Escrow not found')

  // Update steps, status, and logs
  let nextStatus = escrow.status
  switch (action) {
    case 'buyer_funded':
      nextStatus = 'funded'
      break
    case 'seller_confirmed':
      nextStatus = 'confirmed'
      break
    case 'release':
      nextStatus = 'released'
      break
    case 'dispute':
      nextStatus = 'disputed'
      break
    case 'resolve':
      nextStatus = 'resolved'
      break
    case 'cancel':
      nextStatus = 'cancelled'
      break
    default:
      break
  }

  await db.Escrow.updateOne(
    { id: escrowId },
    {
      $set: { status: nextStatus, updatedAt: new Date() },
      $push: { stages: { at: new Date(), action, actor: actorId, meta } }
    }
  )

  // Notify both parties (customize as needed)
  if (action === 'buyer_funded') {
    notificationService.sendMessage(escrow.seller, `💰 <b>Buyer funded the escrow.</b> Please confirm delivery.`)
  } else if (action === 'release') {
    notificationService.sendMessage(escrow.buyer, `✅ <b>Escrow released!</b> Your payment has been sent to the seller.`)
    notificationService.sendMessage(escrow.seller, `✅ <b>Escrow released!</b> Funds should appear in your wallet.`)
  } else if (action === 'dispute') {
    // Inform admins, buyers, sellers as appropriate
  }
}

/**
 * Get escrow deals for a user (buyer or seller).
 */
exports.getEscrowsForUser = async (userId) => {
  return db.Escrow.find({ $or: [{ buyer: userId }, { seller: userId }] }).populate('listing buyer seller')
}

/**
 * Get an escrow by ID.
 */
exports.getEscrowById = async (escrowId) => {
  return db.Escrow.findOne({ id: escrowId }).populate('listing buyer seller')
}
