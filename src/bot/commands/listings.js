// src/bot/commands/listings.js
const marketplaceService = require('../../services/marketplaceService')
const { Markup } = require('telegraf')
const { SECTORS } = require('../../utils/constants')

function getCategoryLabel(categories, key) {
  const cat = categories.find((c) => c.key === key)
  return cat ? `${cat.emoji} ${cat.label}` : key
}

module.exports = async (ctx) => {
  // Parsing callback data or query params for paging/filtering
  const data = ctx.callbackQuery?.data
  let page = 1
  let category = null

  if (data && data.startsWith('LISTINGS_PAGE_')) {
    page = parseInt(data.replace('LISTINGS_PAGE_', ''), 10)
  }
  if (data && data.startsWith('LISTINGS_CAT_')) {
    category = data.replace('LISTINGS_CAT_', '')
  }

  // Fetch listings page
  const { total, listings } = await marketplaceService.getListings({
    category,
    page,
    pageSize: 5,
    boostedFirst: true,
  })

  if (total === 0) {
    return ctx.replyWithHTML(
      '🏪 <b>No marketplace listings found!</b>\nTry another category or check back soon.',
      Markup.inlineKeyboard([
        SECTORS.map((s) =>
          Markup.button.callback(getCategoryLabel(SECTORS, s.key), `LISTINGS_CAT_${s.key}`)
        ),
      ])
    )
  }

  // Render current page
  let text =
    `🏪 <b>Marketplace Listings</b>\nShowing <b>${listings.length}</b> of <b>${total}</b>:\n\n` +
    listings
      .map(
        (item, i) =>
          `#${(page - 1) * 5 + i + 1}${
            item.boosted ? ' ⭐️' : ''
          }\n<b>${getCategoryLabel(SECTORS, item.category)}</b> — <b>${item.price}</b> USDT\n${item.details
            .slice(0, 100)
            .replace(/\n/g, ' ')}\n<code>ID: ${item.id}</code>\n`
      )
      .join('\n')

  // Navigation
  let nav = []
  if (page > 1) nav.push(Markup.button.callback('⬅️ Prev', `LISTINGS_PAGE_${page - 1}`))
  if (page * 5 < total) nav.push(Markup.button.callback('Next ➡️', `LISTINGS_PAGE_${page + 1}`))
  // Category filters
  let filterRow = SECTORS.map((s) =>
    Markup.button.callback(getCategoryLabel(SECTORS, s.key), `LISTINGS_CAT_${s.key}`)
  )

  return ctx.replyWithHTML(text, Markup.inlineKeyboard([nav, filterRow]))
}
