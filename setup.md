# 🤖 Telegram Marketplace Bot - Setup Guide

A comprehensive marketplace bot built with **Telegraf v4** featuring role-based access, admin approval system, Telegram Stars payments, and much more.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Bot Setup](#bot-setup)
5. [Running the Bot](#running-the-bot)
6. [Features Overview](#features-overview)
7. [Architecture](#architecture)
8. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

- **Node.js**: v18.0.0 or higher
- **NPM**: Latest version
- **Telegram Bot Token**: From @BotFather
- **Admin User IDs**: Telegram user IDs for administrators

## 📦 Installation

1. **Clone or download the project**
   ```bash
   # If you have the project files
   cd telegram-marketplace-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

## ⚙️ Configuration

Edit the `.env` file with your configuration:

```env
# Required - Get from @BotFather
BOT_TOKEN=your_telegram_bot_token_here

# Required - Telegram User IDs (comma-separated)
ADMIN_IDS=123456789,987654321

# Optional - Database (placeholder for future use)
MONGODB_URI=mongodb://localhost:27017/marketplace_bot

# Optional - Feature flags
ENABLE_PREMIUM=true
ENABLE_ESCROW=true
ENABLE_BOOSTS=true

# Environment
NODE_ENV=development
```

### 🤖 Getting a Bot Token

1. Message @BotFather on Telegram
2. Send `/newbot`
3. Choose a name and username for your bot
4. Copy the bot token to your `.env` file

### 👥 Getting Admin User IDs

1. Message @userinfobot on Telegram
2. Forward a message from each admin
3. Copy the user IDs to your `.env` file (comma-separated)

## 🚀 Running the Bot

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The bot will launch and display:
```
✅ Configuration loaded
🚀 Bot launched successfully!
```

## ✨ Features Overview

### 🎭 **Role-Based System**
- **Buyer**: Browse and purchase services
- **Vendor**: Create and manage listings
- **Caller**: Make service calls
- **Partner**: Business partnerships
- **Admin**: Full system access

### 🛡️ **Admin Features**
- Approval queue for new users
- Profile change approvals
- Broadcast messaging
- User request management
- Audit logging

### 🏪 **Marketplace**
- Browse listings with pagination
- Advanced filtering and sorting
- Create and manage listings
- Boost listings for visibility
- Express interest in services

### 💸 **Telegram Stars Integration**
- Deposit Stars to wallet
- Pay for premium features
- Escrow system for secure transactions
- Automatic payment processing
- Transaction history

### 🚀 **Premium Features**
- Profile and listing boosts
- Premium membership plans
- Enhanced visibility
- Priority support

### 🎮 **Gamification**
- Trust score system
- Mission and reward system
- Referral program
- Achievement badges

## 🏗️ Architecture

### **File Structure**
```
telegram-marketplace-bot/
├── index.js                 # Main entry point
├── config.js               # Configuration loader
├── package.json            # Dependencies & scripts
├── .env                    # Environment variables
├── middleware/
│   └── adminAuth.js        # Admin authentication
├── router/
│   └── index.js           # Main router & callback handlers
├── ui/
│   ├── templates.js       # Message templates
│   ├── keyboards.js       # Inline keyboard builders
│   └── staleGuard.js      # Stale button handler
├── utils/
│   └── index.js           # Utility functions
└── modules/
    ├── onboarding.js      # Welcome & role selection
    ├── approvals.js       # Admin approval system
    ├── profile.js         # Profile management
    ├── marketplace.js     # Marketplace functionality
    ├── wallet.js          # Telegram Stars wallet
    ├── referrals.js       # Referral program
    ├── boosts.js          # Boost system
    ├── premium.js         # Premium features
    ├── trust.js           # Trust score system
    ├── missions.js        # Missions & rewards
    ├── notifications.js   # Notification center
    └── support.js         # Support system
```

### **Key Design Principles**

1. **Inline Buttons Only**: No text commands required from users
2. **HTML Parse Mode**: All messages use HTML formatting with emojis
3. **Modular Architecture**: Each feature is a separate module
4. **Session Management**: In-memory sessions (upgradeable to persistent storage)
5. **Admin Controls**: Comprehensive admin panel with approval workflows
6. **Payment Integration**: Native Telegram Stars support
7. **Error Handling**: Global error handlers with user-friendly messages

## 🎯 User Flow

### **New User Journey**
1. **Start** → Welcome message with role selection
2. **Role Selection** → Choose buyer/vendor/caller/partner role
3. **Approval Queue** → Admin reviews and approves/rejects
4. **Profile Setup** → Complete profile wizard (sector, experience, etc.)
5. **Main Menu** → Access all features

### **Admin Workflow**
1. **Admin Panel** → Access via main menu (admin users only)
2. **Approvals** → Review pending role and profile change requests
3. **Broadcast** → Send messages to all users
4. **Audit Log** → View system activity

### **Marketplace Flow**
1. **Browse** → View listings with filters and pagination
2. **Create Listing** → Multi-step wizard for new listings
3. **Express Interest** → Contact sellers about listings
4. **Boost** → Pay to increase listing visibility

### **Payment Flow**
1. **Wallet** → View balance and transaction history
2. **Deposit** → Purchase Stars via Telegram's native system
3. **Pay** → Use Stars for boosts, premium, escrow
4. **Escrow** → Secure transactions between buyers/sellers

## 🔧 Customization

### **Adding New Features**
1. Create a new module in `modules/`
2. Add route handlers in `router/index.js`
3. Create UI templates and keyboards
4. Update the main menu if needed

### **Database Integration**
The bot is designed to easily integrate with MongoDB:
1. Install MongoDB driver: `npm install mongodb`
2. Update `config.js` to connect to database
3. Replace `config.mockData` usage with database queries
4. Implement proper session storage

### **Payment Providers**
Currently supports Telegram Stars. To add other providers:
1. Update invoice creation in wallet/boost/premium modules
2. Add provider tokens to configuration
3. Handle different payment types in success handlers

## 🐛 Troubleshooting

### **Common Issues**

**Bot doesn't respond:**
- Check bot token is correct in `.env`
- Ensure bot is not banned or blocked
- Check console for error messages

**Admin features not working:**
- Verify admin user IDs are correct in `.env`
- User IDs must be numeric, not usernames
- Restart bot after changing admin IDs

**Payments failing:**
- Telegram Stars require no provider token (use empty string)
- Check invoice parameters match Telegram's requirements
- Test with small amounts first

**Session issues:**
- Current implementation uses in-memory sessions
- Sessions reset when bot restarts
- Consider implementing persistent session storage for production

### **Getting Help**

1. Check bot logs in console
2. Verify configuration in `.env`
3. Test with a simple `/start` command
4. Check Telegram Bot API documentation
5. Review module-specific error handling

## 📝 Development Notes

### **Mock Data**
The bot currently uses in-memory mock data for:
- User profiles and roles
- Marketplace listings
- Wallet balances
- Transaction history
- Mission progress

This is perfect for development and demonstration, but production deployments should implement persistent storage.

### **Security Considerations**
- Admin authentication is checked on every admin action
- Callback data is validated to prevent unauthorized access
- Payment verification uses Telegram's built-in security
- No sensitive data is stored in sessions

### **Scalability**
- Modular architecture allows easy feature additions
- Session storage can be upgraded to Redis/database
- Bot API calls can be rate-limited if needed
- Multiple bot instances can share the same database

## 🎉 Conclusion

This Telegram Marketplace Bot provides a comprehensive foundation for building marketplace applications within Telegram. It demonstrates best practices for bot development, payment integration, and user experience design.

The bot is production-ready for small to medium deployments and can be easily scaled and customized for specific business requirements.

Happy botting! 🚀
