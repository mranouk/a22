// src/services/marketplaceService.js
const db = require('./db')
const { v4: uuidv4 } = require('uuid')

/**
 * Create a new marketplace listing (pending approval).
 * @param {ObjectId} creatorId
 * @param {Object} listingData { details, category, price }
 * @returns {Promise<String>} listingId
 */
exports.createListing = async (creatorId, { details, category, price }) => {
  const id = uuidv4()
  await db.Listing.create({
    id,
    creator: creatorId,
    details,
    category,
    price,
    status: 'pending',
    visible: false,
    logs: [{ at: new Date(), action: 'created', meta: { details, category, price } }]
  })
  return id
}

/**
 * Update listing status after admin decision. Used by approvalHandler.
 */
exports.approveListing = async (reqId, adminId) => {
  // Find the roleRequest object for this listing
  const req = await db.RoleRequest.findById(reqId)
  if (!req || req.type !== 'listing' || req.status !== 'pending') throw new Error('Invalid listing approval request')
  await db.Listing.updateOne({ id: req.payload.listingId }, { $set: { status: 'approved', visible: true } })
  await db.RoleRequest.updateOne({ id: reqId }, { $set: { status: 'approved', approvedBy: adminId, approvedAt: new Date() } })
  return { userId: req.user }
}

exports.rejectListing = async (reqId, adminId) => {
  const req = await db.RoleRequest.findById(reqId)
  if (!req || req.type !== 'listing' || req.status !== 'pending') throw new Error('Invalid listing rejection request')
  await db.Listing.updateOne({ id: req.payload.listingId }, { $set: { status: 'rejected', visible: false } })
  await db.RoleRequest.updateOne({ id: reqId }, { $set: { status: 'rejected', approvedBy: adminId, approvedAt: new Date() } })
  return { userId: req.user }
}

/**
 * Get listings for the marketplace.
 * Supports filter, paging, ordering by boost & trust.
 */
exports.getListings = async ({ category, minPrice, maxPrice, page = 1, pageSize = 10, boostedFirst = true }) => {
  const filter = { visible: true, status: 'approved' }
  if (category) filter.category = category
  if (minPrice !== undefined) filter.price = { ...filter.price, $gte: minPrice }
  if (maxPrice !== undefined) filter.price = { ...filter.price, $lte: maxPrice }

  // Query and order: boosted first, then by recency or trust (expand as needed)
  const sort = boostedFirst
    ? { boosted: -1, updatedAt: -1 }
    : { updatedAt: -1 }

  const total = await db.Listing.countDocuments(filter)
  const listings = await db.Listing.find(filter)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate('creator')
  return { total, listings }
}

/**
 * Mark a listing as boosted.
 */
exports.boostListing = async (listingId) => {
  await db.Listing.updateOne({ id: listingId }, { $set: { boosted: true } })
}

/**
 * Get a listing by ID.
 */
exports.getListingById = async (id) => {
  return db.Listing.findOne({ id }).populate('creator')
}
