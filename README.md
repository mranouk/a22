# 🚀 Telegram Marketplace Bot

A comprehensive, feature-rich Telegram bot for marketplace operations built with Node.js and Telegraf. The bot facilitates user onboarding, role management, marketplace transactions, wallet operations, referrals, boosting, and full admin controls - all through inline button interactions.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Admin Panel](#-admin-panel)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🔐 User Management
- **Role-based Onboarding**: Buyer, Vendor, Caller roles with admin approval
- **Profile Management**: Step-by-step profile completion with validation
- **Trust Score System**: Dynamic scoring based on user behavior and transactions
- **Badge Levels**: Bronze, Silver, Gold, Platinum, Diamond progression
- **Referral Program**: Comprehensive referral tracking and rewards

### 🏪 Marketplace
- **Listing Creation**: Guided wizard for creating marketplace listings
- **Category Management**: Organized categorization system
- **Search & Filtering**: Advanced filtering by category, price, location
- **Boost System**: Paid promotion for enhanced visibility
- **Location Support**: GPS coordinates and text-based locations

### 💰 Payment System
- **Telegram Native Payments**: Integration with Telegram's built-in wallet
- **Telegram Stars**: Support for Telegram's virtual currency (XTR)
- **Internal Wallet**: USD balance management for marketplace transactions
- **Escrow System**: Secure transaction protection for buyers and sellers
- **Transaction History**: Detailed transaction tracking and reporting

### 🔧 Admin Panel
- **Request Approval**: Role assignments and profile changes approval
- **User Management**: Ban/unban users, view user statistics
- **Broadcast System**: Send announcements to all users or specific roles
- **Moderation Queue**: Review reported content and listings
- **Audit Logs**: Complete activity tracking for compliance
- **System Statistics**: Real-time dashboard with key metrics

### 🎯 Additional Features
- **Rate Limiting**: Comprehensive abuse prevention
- **Notification System**: Real-time notifications for all actions
- **Multi-language Support**: HTML formatting with emoji enhancement
- **Error Handling**: Robust error handling and logging
- **Security**: Authentication, authorization, and data validation

## 🏗️ Architecture

### File Structure
```
project-root/
├── src/
│   ├── bot/
│   │   ├── commands/           # Bot command handlers
│   │   │   ├── admin/         # Admin-specific commands
│   │   │   ├── boost.js       # Boost management
│   │   │   ├── marketplace.js # Marketplace operations
│   │   │   ├── referral.js    # Referral program
│   │   │   └── wallet.js      # Wallet operations
│   │   ├── middlewares/       # Authentication and validation
│   │   ├── scenes/           # Multi-step wizards
│   │   ├── handlers/         # Business logic handlers
│   │   └── index.js          # Bot initialization
│   ├── services/             # Business logic layer
│   ├── models/              # Database schemas
│   ├── utils/               # Utility functions
│   ├── config/              # Configuration files
│   └── app.js               # Application entry point
├── tests/                   # Test suites
├── scripts/                 # Utility scripts
├── .env                     # Environment variables
└── package.json
```

### Core Components

#### Models
- **User**: User profiles, roles, and authentication
- **Wallet**: Payment processing and transaction history
- **Listing**: Marketplace items and services
- **Referral**: Referral tracking and rewards
- **Boost**: Promotion and visibility enhancement
- **AuditLog**: Admin action tracking

#### Services
- **userService**: User management and authentication
- **walletService**: Payment processing and balance management
- **marketplaceService**: Listing management and search
- **referralService**: Referral program logic
- **boostService**: Promotion and visibility features
- **adminService**: Administrative functions

#### Handlers
- **trustScoreHandler**: Trust score calculation and badge management
- **referralHandler**: Referral bonus processing
- **boostHandler**: Boost activation and management

## 📦 Prerequisites

- Node.js 16+ 
- MongoDB 4.4+
- Telegram Bot Token
- Telegram Payment Provider Token (for payments)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telegram-marketplace-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure the application**
   ```bash
   # Edit configuration files in src/config/
   ```

5. **Start the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## ⚙️ Configuration

### Environment Variables (.env)
```env
# Bot Configuration
BOT_TOKEN=your_telegram_bot_token
BOT_USERNAME=your_bot_username
TELEGRAM_PAYMENT_TOKEN=your_payment_provider_token

# Database
MONGODB_URI=mongodb://localhost:27017/marketplace

# Admin Configuration
ADMIN_IDS=123456789,987654321

# Application Settings
NODE_ENV=development
PORT=3000
SESSION_TTL=86400

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Business Logic
REFERRAL_BONUS=10
TRUST_SCORE_INITIAL=100
BOOST_COST_USD=5
PREMIUM_COST_USD=9.99

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Configuration Files

#### `src/config/default.json`
```json
{
  "telegram": {
    "token": "",
    "username": "",
    "webhook": {
      "enabled": false,
      "url": "",
      "port": 3000
    }
  },
  "database": {
    "uri": "mongodb://localhost:27017/marketplace",
    "options": {
      "useNewUrlParser": true,
      "useUnifiedTopology": true
    }
  },
  "admin": {
    "adminIds": [],
    "permissions": {
      "approve_requests": true,
      "manage_users": true,
      "broadcast_messages": true,
      "view_audit_logs": true,
      "moderate_content": true
    }
  },
  "features": {
    "referrals": {
      "enabled": true,
      "registrationBonus": 10,
      "firstPurchaseBonus": 5,
      "commissionRate": 0.02
    },
    "trustScore": {
      "enabled": true,
      "initialScore": 100,
      "maxScore": 1000,
      "minScore": 0
    },
    "boost": {
      "enabled": true,
      "costUSD": 5,
      "durationHours": 24
    },
    "premium": {
      "enabled": true,
      "costUSD": 9.99,
      "durationDays": 30
    }
  }
}
```

## 🎮 Usage

### User Flow

1. **Getting Started**
   - User starts the bot with `/start`
   - Selects role (Buyer/Vendor/Caller) via inline buttons
   - Waits for admin approval
   - Completes profile information

2. **Marketplace Operations**
   - Browse listings with filtering and pagination
   - Create listings through guided wizard
   - Make purchases with escrow protection
   - Boost listings for enhanced visibility

3. **Wallet Management**
   - Add funds via Telegram payments
   - Purchase Telegram Stars for premium features
   - View transaction history
   - Manage escrow transactions

4. **Referral Program**
   - Share referral links
   - Track referral statistics
   - Claim earned rewards

### Admin Flow

1. **Dashboard Access**
   - Access admin panel via `/admin` command
   - View system statistics and metrics

2. **Request Management**
   - Review pending role assignments
   - Approve/reject profile updates
   - Bulk operations for efficiency

3. **User Management**
   - Search and filter users
   - Ban/unban problematic users
   - View detailed user profiles

4. **Content Moderation**
   - Review reported listings
   - Approve/remove content
   - Flag suspicious activity

5. **Communication**
   - Send broadcast messages
   - Target specific user roles
   - Track message delivery

## 📚 API Documentation

### Core Services

#### UserService
```javascript
// Create or update user
await userService.createOrUpdateUser(telegramUser);

// Generate referral code
await userService.generateReferralCode(userId);

// Find user by referral code
await userService.findByReferralCode(referralCode);
```

#### WalletService
```javascript
// Create deposit invoice
await walletService.createDepositInvoice(userId, amount, description);

// Process payment
await walletService.processPayment(paymentData);

// Transfer funds
await walletService.transferFunds(fromUserId, toUserId, amount, description);

// Create escrow
await walletService.createEscrow(buyerId, sellerId, amount, description);
```

#### MarketplaceService
```javascript
// Create listing
await marketplaceService.createListing(listingData);

// Search listings
await marketplaceService.searchListings(filters, pagination);

// Update listing status
await marketplaceService.updateListingStatus(listingId, status);
```

### Telegram Bot Commands

#### User Commands
- `/start` - Initialize bot and role selection
- `/help` - Show help information
- `/menu` - Return to main menu

#### Admin Commands
- `/admin` - Access admin panel (admin only)

### Inline Button Actions

#### Main Navigation
- `main_menu` - Return to main menu
- `marketplace` - Access marketplace
- `wallet_main` - Access wallet
- `referral_main` - Access referrals
- `boost_main` - Access boost options
- `profile_main` - Access profile

#### Marketplace Actions
- `marketplace_browse` - Browse listings
- `marketplace_create` - Create new listing
- `marketplace_my_listings` - View own listings
- `listing_view_{id}` - View specific listing
- `listing_boost_{id}` - Boost specific listing

#### Wallet Actions
- `wallet_deposit` - Initiate deposit
- `wallet_deposit_{amount}` - Deposit specific amount
- `wallet_buy_stars` - Purchase Telegram Stars
- `wallet_history` - View transaction history
- `wallet_escrow` - View escrow status

## 🛡️ Admin Panel

### Features Overview

#### Dashboard
- Real-time system statistics
- User growth metrics
- Revenue tracking
- Performance indicators

#### Request Management
- **Role Assignments**: Approve/reject user role requests
- **Profile Updates**: Review restricted field changes
- **Bulk Operations**: Process multiple requests efficiently

#### User Management
- **Search & Filter**: Find users by various criteria
- **User Details**: View comprehensive user profiles
- **Account Actions**: Ban/unban, adjust trust scores
- **Activity Tracking**: Monitor user behavior patterns

#### Content Moderation
- **Listing Review**: Approve/reject marketplace listings
- **Report Management**: Handle user reports and flags
- **Content Removal**: Remove violating content
- **Auto-moderation**: Automated content screening

#### Communication
- **Broadcast Messages**: Send announcements to all users
- **Targeted Messaging**: Send to specific roles or users
- **Message Templates**: Pre-defined message formats
- **Delivery Tracking**: Monitor message delivery status

#### Analytics & Reporting
- **System Metrics**: Performance and usage statistics
- **Revenue Reports**: Payment and transaction analysis
- **User Analytics**: Growth and engagement metrics
- **Audit Trail**: Complete action history

### Admin Interface Navigation

```
🔧 Admin Panel
├── 📊 Dashboard
│   ├── System Stats
│   ├── User Metrics
│   └── Revenue Overview
├── 📋 Requests
│   ├── Pending Approvals
│   ├── Role Assignments
│   └── Profile Updates
├── 👥 Users
│   ├── User Search
│   ├── User Management
│   └── Account Actions
├── 🛡️ Moderation
│   ├── Content Queue
│   ├── Reported Items
│   └── Automatic Reviews
├── 📢 Broadcast
│   ├── Send Messages
│   ├── Target Audiences
│   └── Message History
└── 📊 Analytics
    ├── System Reports
    ├── User Analytics
    └── Audit Logs
```

## 🔒 Security

### Authentication & Authorization
- **Role-based Access Control**: Different permissions for each user role
- **Admin Verification**: Multiple layers of admin authentication
- **Session Management**: Secure session handling with TTL
- **Request Validation**: Input validation for all user inputs

### Data Protection
- **Input Sanitization**: XSS and injection protection
- **Data Encryption**: Sensitive data encryption at rest
- **Secure Communications**: HTTPS/WSS for all communications
- **Privacy Controls**: User data anonymization options

### Rate Limiting
- **Action Throttling**: Prevent spam and abuse
- **Progressive Limits**: Increasing restrictions for violations
- **Trust-based Limits**: Adjusted limits based on trust scores
- **Burst Protection**: Handle traffic spikes gracefully

### Audit & Compliance
- **Activity Logging**: Complete audit trail for all actions
- **Admin Oversight**: All admin actions logged and monitored
- **Data Retention**: Configurable data retention policies
- **Compliance Tools**: GDPR and data protection compliance

## 🧪 Testing

### Test Structure
```bash
tests/
├── unit/
│   ├── services/
│   ├── utils/
│   └── models/
├── integration/
│   ├── bot/
│   ├── api/
│   └── database/
└── e2e/
    ├── user-flows/
    └── admin-flows/
```

### Running Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 🚀 Deployment

### Production Setup

1. **Environment Preparation**
   ```bash
   # Set production environment
   export NODE_ENV=production
   
   # Configure MongoDB
   # Set up Redis for sessions (optional)
   # Configure Nginx for reverse proxy
   ```

2. **SSL Certificate**
   ```bash
   # For webhook mode (recommended for production)
   # Obtain SSL certificate for your domain
   certbot --nginx -d your-domain.com
   ```

3. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start ecosystem.config.js
   
   # Using Docker
   docker-compose up -d
   ```

4. **Monitoring**
   ```bash
   # Set up log monitoring
   # Configure health checks
   # Set up alerts for errors
   ```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - mongodb
  
  mongodb:
    image: mongo:4.4
    volumes:
      - mongodb_data:/data/db
    
volumes:
  mongodb_data:
```

## 📈 Performance & Scalability

### Optimization Features
- **Database Indexing**: Optimized queries for large datasets
- **Caching Strategy**: Redis caching for frequently accessed data
- **Connection Pooling**: Efficient database connection management
- **Memory Management**: Optimized memory usage patterns

### Scaling Considerations
- **Horizontal Scaling**: Multi-instance deployment support
- **Load Balancing**: Request distribution across instances
- **Database Sharding**: Large-scale data distribution
- **CDN Integration**: Static asset delivery optimization

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- **ESLint**: Code linting and formatting
- **Prettier**: Code style consistency
- **JSDoc**: Function and class documentation
- **Git Hooks**: Pre-commit validation

### Pull Request Process
1. Update documentation for new features
2. Add/update tests as needed
3. Ensure backward compatibility
4. Follow semantic versioning for releases

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Reference](docs/api.md)
- [Configuration Guide](docs/configuration.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

### Community
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Documentation wiki for guides

### Enterprise Support
For enterprise deployments and custom solutions, contact our team for dedicated support options.

---

## 🎯 Roadmap

### Upcoming Features
- [ ] Mobile app companion
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] AI-powered content moderation
- [ ] Integration with external payment providers
- [ ] Advanced marketplace features (auctions, subscriptions)
- [ ] Enhanced security features (2FA, device management)

### Version History
- **v1.0.0** - Initial release with core marketplace functionality
- **v1.1.0** - Enhanced admin panel and analytics
- **v1.2.0** - Telegram Stars integration and improved UI
- **v1.3.0** - Advanced referral system and trust scoring

---

Built with ❤️ using Node.js, Telegraf, and MongoDB
