const { Scenes, Markup } = require('telegraf');

const walletWizard = new Scenes.WizardScene(
  'walletWizard',
  // Step 1: Main Action Selection
  async (ctx) => {
    await ctx.replyWithHTML(
      '💰 <b>Wallet Operations</b>\n\nChoose an action:',
      Markup.inlineKeyboard([
        [Markup.button.callback('➕ Deposit Funds', 'deposit')],
        [Markup.button.callback('⭐ Buy Stars', 'buy_stars')],
        [Markup.button.callback('⬅️ Cancel', 'wallet_cancel')]
      ])
    );
    return ctx.wizard.next();
  },

  // Step 2: Action Handler
  async (ctx) => {
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      if (action === 'deposit') {
        await ctx.replyWithHTML(
          '➕ <b>Deposit Funds</b>\n\nSelect the amount to deposit:',
          Markup.inlineKeyboard([
            [Markup.button.callback('💵 $5', 'deposit_amount_5'), Markup.button.callback('💵 $10', 'deposit_amount_10')],
            [Markup.button.callback('💵 $25', 'deposit_amount_25')],
            [Markup.button.callback('⬅️ Cancel', 'wallet_cancel')]
          ])
        );
        ctx.wizard.state.flow = 'deposit';
        return ctx.wizard.next();
      } else if (action === 'buy_stars') {
        await ctx.replyWithHTML(
          '⭐ <b>Buy Telegram Stars</b>\n\nChoose the amount:',
          Markup.inlineKeyboard([
            [Markup.button.callback('⭐ 100 Stars', 'buy_stars_100'), Markup.button.callback('⭐ 500 Stars', 'buy_stars_500')],
            [Markup.button.callback('⬅️ Cancel', 'wallet_cancel')]
          ])
        );
        ctx.wizard.state.flow = 'buy_stars';
        return ctx.wizard.next();
      } else if (action === 'wallet_cancel') {
        await ctx.replyWithHTML('❌ <b>Wallet operation cancelled.</b>');
        return ctx.scene.leave();
      }
    }
  },

  // Step 3: Handle Amount Selection
  async (ctx) => {
    if (ctx.wizard.state.flow === 'deposit') {
      if (ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;
        let amount;
        if (data.startsWith('deposit_amount_')) {
          amount = parseInt(data.replace('deposit_amount_', ''), 10);
          if (isNaN(amount) || amount < 1) {
            await ctx.replyWithHTML('⚠️ <b>Enter a valid deposit amount.</b>');
            return;
          }
          // Generate Telegram payment invoice
          await ctx.replyWithHTML(
            `🧾 <b>Invoice</b>\n\nDeposit <b>$${amount}</b> to your wallet using Telegram Payments.`
          );
          const invoiceData = {
            title: 'Wallet Deposit',
            description: `Deposit $${amount} to your wallet`,
            payload: `deposit_${ctx.from.id}_${Date.now()}`,
            provider_token: process.env.TELEGRAM_PAYMENT_TOKEN,
            currency: 'USD',
            prices: [{ label: 'Deposit', amount: amount * 100 }]
          };
          await ctx.replyWithInvoice(invoiceData);
          return ctx.scene.leave();
        }
      }
    } else if (ctx.wizard.state.flow === 'buy_stars') {
      if (ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;
        let starsAmount;
        if (data.startsWith('buy_stars_')) {
          starsAmount = parseInt(data.replace('buy_stars_', ''), 10);
          if (isNaN(starsAmount) || starsAmount < 1) {
            await ctx.replyWithHTML('⚠️ <b>Enter a valid Stars amount.</b>');
            return;
          }
          // Generate Telegram Stars invoice
          await ctx.replyWithHTML(
            `🧾 <b>Invoice</b>\n\nBuy <b>${starsAmount} Stars</b> using Telegram Payments.`
          );
          const invoiceData = {
            title: 'Buy Stars',
            description: `Purchase ${starsAmount} Telegram Stars`,
            payload: `stars_${ctx.from.id}_${Date.now()}`,
            provider_token: process.env.TELEGRAM_PAYMENT_TOKEN,
            currency: 'XTR',
            prices: [{ label: 'Stars', amount: starsAmount }]
          };
          await ctx.replyWithInvoice(invoiceData);
          return ctx.scene.leave();
        }
      }
    }
    // Cancel handler
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'wallet_cancel') {
      await ctx.replyWithHTML('❌ <b>Wallet operation cancelled.</b>');
      return ctx.scene.leave();
    }
  }
);

module.exports = walletWizard;