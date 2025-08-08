const templates = {
    success: (message) => `✅ <b>Success:</b> ${message}`,
    error: (message) => `⚠️ <b>Error:</b> ${message}`,
    warning: (message) => `⚠️ <b>Warning:</b> ${message}`,
    info: (message) => `ℹ️ <b>Info:</b> ${message}`,
    waiting: (message) => `⏳ <b>Please wait:</b> ${message}`,
    completed: (message) => `🎉 <b>Completed:</b> ${message}`,
    blocked: (message) => `🚫 <b>Not allowed:</b> ${message}`,

    welcome: () => `🎉 <b>Welcome to the Marketplace Bot!</b>

Choose your role to begin your journey:`,

    pendingApproval: () => `⏳ <b>Waiting for approval!</b>

Your role request is being reviewed by our team. You'll be notified shortly.

While you wait:
• ℹ️ Learn about our platform
• 🔄 Check your application status`,

    approvalGranted: (role) => `🎉 <b>Congratulations! Your application has been approved!</b>

Your role: <b>${role}</b>

Let's complete your profile to get started.`,

    mainMenu: () => `🏠 <b>Main Menu</b>

What would you like to do today?`,

    profileComplete: () => `👤 <b>Profile Setup Complete!</b>

Welcome to the marketplace! Your profile is now active and ready.`,

    listingCreated: (title) => `🎉 <b>Listing Created Successfully!</b>

📝 <b>${title}</b> has been published to the marketplace.

What's next?
• 🚀 Boost for more visibility
• 📊 Track your performance`,

    paymentSuccess: (amount) => `✅ <b>Payment Successful!</b>

Amount: ⭐ ${amount} Stars
Transaction completed successfully.

🧾 Receipt saved to your transaction history.`,

    escrowCreated: (dealId, amount) => `🛡️ <b>Escrow Deal Created</b>

Deal ID: <code>${dealId}</code>
Amount: ⭐ ${amount} Stars
Status: ⏳ Awaiting funding

The buyer should fund the escrow to proceed.`
};

module.exports = { templates };
