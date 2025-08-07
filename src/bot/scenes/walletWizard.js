const { Scenes, Markup } = require('telegraf');
const walletService = require('../../services/walletService');
const { formatCurrency } = require('../../utils/helpers');
const logger = require('../../utils/logger');

const walletWizard = new Scenes.WizardScene(
  'walletWizard',
  // Step 1: Choose action (withdraw or escrow)
  async (ctx) => {
    const action = ctx.scene.state?.action;
    if (action === 'withdraw') {
      await ctx.replyWithHTML(
        '💸 <b>Withdraw Funds</b>\n\nHow much would you like to withdraw?',
        Markup.inlineKeyboard([
          [Markup.button.callback('💵 $10', 'withdraw_amount_10'), Markup.button.callback('💵 $50', 'withdraw_amount_50')],
          [Markup.button.callback('💵 $100', 'withdraw_amount_100'), Markup.button.callback('💰 Custom Amount', 'withdraw_amount_custom')],
          [Markup.button.callback('⬅️ Cancel', 'wallet_cancel')]
        ])
      );
      ctx.wizard.state.flow = 'withdraw';
      return ctx.wizard.next();
    } else if (action === 'escrow') {
      await ctx.replyWithHTML(
        '🛡️ <b>Start Escrow Deal</b>\n\nAre you the <b>Buyer</b> or <b>Seller</b>?',
        Markup.inlineKeyboard([
          [Markup.button.callback('🛒 Buyer', 'escrow_role_buyer'), Markup.button.callback('🏪 Seller', 'escrow_role_seller')],
          [Markup.button.callback('⬅️ Cancel', 'wallet_cancel')]
        ])
      );
      ctx.wizard.state.flow = 'escrow';
      return ctx.wizard.next();
    } else {
      await ctx.replyWithHTML('⛔️ Invalid wallet action.');
      return ctx.scene.leave();
    }
  },
  // Step 2: Withdrawal - Amount selection or Escrow - Role selection
  async (ctx) => {
    if (ctx.wizard.state.flow === 'withdraw') {
      let amount;
      if (ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;
        if (data.startsWith('withdraw_amount_')) {
          if (data === 'withdraw_amount_custom') {
            await ctx.replyWithHTML('💰 <b>Enter the amount to withdraw (USD):</b>');
            ctx.wizard.state.awaitingCustomAmount = true;
            return;
          } else {
            amount = parseInt(data.replace('withdraw_amount_', ''), 10);
          }
        }
      } else if (ctx.message && ctx.wizard.state.awaitingCustomAmount) {
        amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount < 1) {
          await ctx.replyWithHTML('⚠️ <b>Enter a valid amount (minimum $1).</b>');
          return;
        }
        ctx.wizard.state.awaitingCustomAmount = false;
      }
      if (!amount) return;
      ctx.wizard.state.withdrawAmount = amount;
      await ctx.replyWithHTML(
        `💳 <b>Enter your crypto address for withdrawal:</b>\n(USDT, BEP20/ERC20)`
      );
      return ctx.wizard.next();
    } else if (ctx.wizard.state.flow === 'escrow') {
      if (ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;
        if (data === 'escrow_role_buyer') {
          ctx.wizard.state.escrowRole = 'buyer';
        } else if (data === 'escrow_role_seller') {
          ctx.wizard.state.escrowRole = 'seller';
        } else if (data === 'wallet_cancel') {
          await ctx.replyWithHTML('❌ <b>Escrow creation cancelled.</b>');
          return ctx.scene.leave();
        }
      }
      if (!ctx.wizard.state.escrowRole) return;
      await ctx.replyWithHTML('💵 <b>Enter the amount for escrow (USD):</b>');
      return ctx.wizard.next();
    }
  },
  // Step 3: Withdrawal - Address input or Escrow - Amount input
  async (ctx) => {
    if (ctx.wizard.state.flow === 'withdraw') {
      if (ctx.message && ctx.message.text) {
        ctx.wizard.state.withdrawAddress = ctx.message.text.trim();
        await ctx.replyWithHTML(
          `✅ <b>Confirm Withdrawal</b>\n\nAmount: <b>$${ctx.wizard.state.withdrawAmount}</b>\nAddress: <code>${ctx.wizard.state.withdrawAddress}</code>`,
          Markup.inlineKeyboard([
            [Markup.button.callback('✅ Confirm', 'withdraw_confirm')],
            [Markup.button.callback('⬅️ Cancel', 'wallet_cancel')]
          ])
        );
        return ctx.wizard.next();
      }
    } else if (ctx.wizard.state.flow === 'escrow') {
      if (ctx.message && ctx.message.text) {
        const amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount < 1) {
          await ctx.replyWithHTML('⚠️ <b>Enter a valid amount (minimum $1).</b>');
          return;
        }
        ctx.wizard.state.escrowAmount = amount;
        await ctx.replyWithHTML('🔗 <b>Enter the Telegram @username of the other party:</b>');
        return ctx.wizard.next();
      }
    }
  },
  // Step 4: Withdrawal - Confirm or Escrow - Counterparty input
  async (ctx) => {
    if (ctx.wizard.state.flow === 'withdraw') {
      if (ctx.callbackQuery && ctx.callbackQuery.data === 'withdraw_confirm') {
        // Process withdrawal
        try {
          const userId = ctx.from.id;
          const amount = ctx.wizard.state.withdrawAmount;
          const address = ctx.wizard.state.withdrawAddress;
          await walletService.requestWithdrawal(userId, { amount, to: address });
          await ctx.replyWithHTML(
            `✅ <b>Withdrawal Requested!</b>\n\n💸 <b>Amount:</b> $${amount}\n🏦 <b>Address:</b> <code>${address}</code>\n\n⏳ Funds will be sent after admin review.`,
            Markup.inlineKeyboard([
              [Markup.button.callback('🏠 Main Menu', 'main_menu')]
            ])
          );
        } catch (error) {
          logger.error('Withdrawal error', error);
          await ctx.replyWithHTML('❌ <b>Error processing withdrawal.</b> Please try again later.');
        }
        return ctx.scene.leave();
      } else if (ctx.callbackQuery && ctx.callbackQuery.data === 'wallet_cancel') {
        await ctx.replyWithHTML('❌ <b>Withdrawal cancelled.</b>');
        return ctx.scene.leave();
      }
    } else if (ctx.wizard.state.flow === 'escrow') {
      if (ctx.message && ctx.message.text) {
        ctx.wizard.state.counterparty = ctx.message.text.trim().replace('@', '');
        await ctx.replyWithHTML(
          `✅ <b>Confirm Escrow</b>\n\nRole: <b>${ctx.wizard.state.escrowRole}</b>\nAmount: <b>$${ctx.wizard.state.escrowAmount}</b>\nCounterparty: <b>@${ctx.wizard.state.counterparty}</b>`,
          Markup.inlineKeyboard([
            [Markup.button.callback('✅ Start Escrow', 'escrow_confirm')],
            [Markup.button.callback('⬅️ Cancel', 'wallet_cancel')]
          ])
        );
        return ctx.wizard.next();
      }
    }
  },
  // Step 5: Escrow - Confirm and create escrow
  async (ctx) => {
    if (ctx.wizard.state.flow === 'escrow') {
      if (ctx.callbackQuery && ctx.callbackQuery.data === 'escrow_confirm') {
        try {
          const userId = ctx.from.id;
          const role = ctx.wizard.state.escrowRole;
          const amount = ctx.wizard.state.escrowAmount;
          const counterpartyUsername = ctx.wizard.state.counterparty;
          // For demo, assume we can resolve userId from username (in production, lookup user)
          // Here, just echo the flow
          await ctx.replyWithHTML(
            `🛡️ <b>Escrow Created!</b>\n\nRole: <b>${role}</b>\nAmount: <b>$${amount}</b>\nCounterparty: <b>@${counterpartyUsername}</b>\n\n⏳ The other party will be notified to proceed.`,
            Markup.inlineKeyboard([
              [Markup.button.callback('🏠 Main Menu', 'main_menu')]
            ])
          );
        } catch (error) {
          logger.error('Escrow error', error);
          await ctx.replyWithHTML('❌ <b>Error creating escrow.</b> Please try again later.');
        }
        return ctx.scene.leave();
      } else if (ctx.callbackQuery && ctx.callbackQuery.data === 'wallet_cancel') {
        await ctx.replyWithHTML('❌ <b>Escrow creation cancelled.</b>');
        return ctx.scene.leave();
      }
    }
  }
);

module.exports = walletWizard;
