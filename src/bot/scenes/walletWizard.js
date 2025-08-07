// src/bot/scenes/walletWizard.js
const { Scenes, Markup } = require('telegraf');
const walletService = require('../../services/walletService');
const { formatCurrency } = require('../../utils/helpers');
const logger = require('../../utils/logger');

// Step 1: Choose action (deposit, withdraw, escrow)
const stepChooseAction = async (ctx) => {
  let action = ctx.scene.state?.action;
  if (!action) {
    await ctx.replyWithHTML(
      '💸 <b>Wallet Actions</b>\n\nChoose what you want to do:',
      Markup.inlineKeyboard([
        [Markup.button.callback('💰 Deposit', 'WALLET_DEPOSIT')],
        [Markup.button.callback('↩️ Withdraw', 'WALLET_WITHDRAW')],
        [Markup.button.callback('🛡️ Escrow', 'WALLET_ESCROW')],
        [Markup.button.callback('⬅️ Back', 'wallet_main')]
      ])
    );
    return ctx.wizard.next();
  }
  ctx.wizard.state.action = action;
  return ctx.wizard.steps[1](ctx);
};

// Step 2: Handle deposit/withdraw/escrow
const stepAction = async (ctx) => {
  let action = ctx.wizard.state.action;
  if (!action && ctx.callbackQuery) {
    const data = ctx.callbackQuery.data;
    if (data === 'WALLET_DEPOSIT') action = 'deposit';
    if (data === 'WALLET_WITHDRAW') action = 'withdraw';
    if (data === 'WALLET_ESCROW') action = 'escrow';
    ctx.wizard.state.action = action;
    await ctx.answerCbQuery();
  }
  if (action === 'deposit') {
    await ctx.replyWithHTML(
      '💰 <b>Deposit Funds</b>\n\nChoose an amount:',
      Markup.inlineKeyboard([
        [Markup.button.callback('💵 $10', 'DEP_10'), Markup.button.callback('💵 $25', 'DEP_25')],
        [Markup.button.callback('💵 $50', 'DEP_50'), Markup.button.callback('💵 $100', 'DEP_100')],
        [Markup.button.callback('💰 Custom', 'DEP_CUSTOM')],
        [Markup.button.callback('⬅️ Back', 'wallet_main')]
      ])
    );
    return ctx.wizard.next();
  } else if (action === 'withdraw') {
    await ctx.replyWithHTML(
      '↩️ <b>Withdraw Funds</b>\n\nChoose an amount:',
      Markup.inlineKeyboard([
        [Markup.button.callback('💵 $10', 'WDR_10'), Markup.button.callback('💵 $25', 'WDR_25')],
        [Markup.button.callback('💵 $50', 'WDR_50'), Markup.button.callback('💵 $100', 'WDR_100')],
        [Markup.button.callback('💰 Custom', 'WDR_CUSTOM')],
        [Markup.button.callback('⬅️ Back', 'wallet_main')]
      ])
    );
    return ctx.wizard.next();
  } else if (action === 'escrow') {
    await ctx.replyWithHTML(
      '🛡️ <b>Escrow</b>\n\nStart a new escrow deal or view status:',
      Markup.inlineKeyboard([
        [Markup.button.callback('➕ New Escrow', 'ESCROW_NEW')],
        [Markup.button.callback('📄 My Escrows', 'ESCROW_LIST')],
        [Markup.button.callback('⬅️ Back', 'wallet_main')]
      ])
    );
    return ctx.wizard.next();
  }
};

// Step 3: Handle amount input or escrow actions
const stepAmountOrEscrow = async (ctx) => {
  const action = ctx.wizard.state.action;
  if (ctx.callbackQuery) {
    const data = ctx.callbackQuery.data;
    if (data.startsWith('DEP_')) {
      if (data === 'DEP_CUSTOM') {
        await ctx.replyWithHTML('💵 <b>Enter custom deposit amount (USD):</b>');
        ctx.wizard.state.awaitingCustom = 'deposit';
        return;
      }
      const amount = parseInt(data.replace('DEP_', ''));
      ctx.wizard.state.amount = amount;
      await ctx.replyWithHTML(`⏳ <b>Processing deposit of $${amount}...</b>`);
      // Call walletService to create deposit invoice
      try {
        const result = await walletService.createDepositInvoice(ctx.from.id, amount, `Deposit $${amount}`);
        if (result.success) {
          await ctx.replyWithInvoice(result.invoice);
          await ctx.replyWithHTML('✅ <b>Invoice sent! Complete payment to fund your wallet.</b>');
        } else {
          await ctx.replyWithHTML('❌ <b>Failed to create deposit invoice.</b>');
        }
      } catch (e) {
        logger.error('Deposit error', e);
        await ctx.replyWithHTML('❌ <b>Error processing deposit.</b>');
      }
      return ctx.scene.leave();
    }
    if (data.startsWith('WDR_')) {
      if (data === 'WDR_CUSTOM') {
        await ctx.replyWithHTML('💵 <b>Enter custom withdrawal amount (USD):</b>');
        ctx.wizard.state.awaitingCustom = 'withdraw';
        return;
      }
      const amount = parseInt(data.replace('WDR_', ''));
      ctx.wizard.state.amount = amount;
      await ctx.replyWithHTML(`⏳ <b>Processing withdrawal of $${amount}...</b>`);
      // Call walletService to process withdrawal
      try {
        const result = await walletService.requestWithdrawal(ctx.from.id, amount);
        if (result.success) {
          await ctx.replyWithHTML('✅ <b>Withdrawal request submitted! Admin will review and process soon.</b>');
        } else {
          await ctx.replyWithHTML('❌ <b>Failed to request withdrawal.</b>');
        }
      } catch (e) {
        logger.error('Withdraw error', e);
        await ctx.replyWithHTML('❌ <b>Error processing withdrawal.</b>');
      }
      return ctx.scene.leave();
    }
    if (data === 'ESCROW_NEW') {
      await ctx.replyWithHTML('🛡️ <b>Escrow creation coming soon!</b>');
      return ctx.scene.leave();
    }
    if (data === 'ESCROW_LIST') {
      await ctx.replyWithHTML('📄 <b>Your escrows:</b>\n(No active escrows found.)');
      return ctx.scene.leave();
    }
    if (data === 'wallet_main' || data === '⬅️ Back') {
      await ctx.replyWithHTML('🏠 <b>Returning to wallet menu.</b>');
      return ctx.scene.leave();
    }
  }
  // Handle custom amount input
  if (ctx.message && ctx.wizard.state.awaitingCustom) {
    const amount = parseFloat(ctx.message.text);
    if (isNaN(amount) || amount < 1) {
      await ctx.replyWithHTML('❌ <b>Enter a valid amount (min $1).</b>');
      return;
    }
    if (ctx.wizard.state.awaitingCustom === 'deposit') {
      ctx.wizard.state.amount = amount;
      await ctx.replyWithHTML(`⏳ <b>Processing deposit of $${amount}...</b>`);
      try {
        const result = await walletService.createDepositInvoice(ctx.from.id, amount, `Deposit $${amount}`);
        if (result.success) {
          await ctx.replyWithInvoice(result.invoice);
          await ctx.replyWithHTML('✅ <b>Invoice sent! Complete payment to fund your wallet.</b>');
        } else {
          await ctx.replyWithHTML('❌ <b>Failed to create deposit invoice.</b>');
        }
      } catch (e) {
        logger.error('Deposit error', e);
        await ctx.replyWithHTML('❌ <b>Error processing deposit.</b>');
      }
      return ctx.scene.leave();
    } else if (ctx.wizard.state.awaitingCustom === 'withdraw') {
      ctx.wizard.state.amount = amount;
      await ctx.replyWithHTML(`⏳ <b>Processing withdrawal of $${amount}...</b>`);
      try {
        const result = await walletService.requestWithdrawal(ctx.from.id, amount);
        if (result.success) {
          await ctx.replyWithHTML('✅ <b>Withdrawal request submitted! Admin will review and process soon.</b>');
        } else {
          await ctx.replyWithHTML('❌ <b>Failed to request withdrawal.</b>');
        }
      } catch (e) {
        logger.error('Withdraw error', e);
        await ctx.replyWithHTML('❌ <b>Error processing withdrawal.</b>');
      }
      return ctx.scene.leave();
    }
  }
};

const walletWizard = new Scenes.WizardScene(
  'walletWizard',
  stepChooseAction,
  stepAction,
  stepAmountOrEscrow
);

module.exports = walletWizard;