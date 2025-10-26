# StarSwipe - NFC-Based Crypto Payment System

StarSwipe is a revolutionary blockchain-based payment application deployed on the Stellar Blockchain, enabling seamless crypto payments through NFC-enabled physical cards. This system leverages Shamir's Secret Sharing (SSS) algorithm to ensure maximum security, making it safe even if the card is lost or the database is compromised. The application provides a secure, fast, and user-friendly way to spend cryptocurrency in the real world.

#### [🌐 Live Demo](https://stellar-pay-wheat.vercel.app/)
#### [📹 Demo Video](#) _(Add your demo video link here)_

---

## 🎯 Project Vision

Our vision is to bridge the gap between cryptocurrency and everyday commerce. StarSwipe aims to make crypto payments as simple as tapping a card, while maintaining the highest security standards through cryptographic protection. By combining NFC technology with blockchain, we're creating a future where spending crypto is as easy as using a traditional debit card.

---

## 📸 Project Screenshots

### Landing Page
![Landing Page](https://github.com/user-attachments/assets/80bdf9c2-0222-4c41-99fb-3cdca7d09144)

*Welcome screen with wallet connection options and a button to register a card*

### Card Registration Flow

![Registration Page](https://github.com/user-attachments/assets/044071ef-59ca-4d56-9f60-838b8b568588)

*Card registration form with daily limit and PIN setup*


![Registration Page](https://github.com/user-attachments/assets/3cfc5a47-9865-416f-930e-5e2da0598cf2)

*Success modal with NFC writing instructions*

### Top-Up Interface
![Top-Up Card](https://github.com/user-attachments/assets/81b191b2-b46d-4797-adec-f08b264bb0c2)

*Simple interface for adding XLM to your NFC card via tap*

### Payment Terminal

![Payment Processing](https://github.com/user-attachments/assets/a7ea0dc7-9d2d-4006-a4c6-7f5979a21447)

![Pin Processing](https://github.com/user-attachments/assets/9bb2d7fb-c5e6-4dc5-a42a-1a215b7d41ee)


*Merchant payment terminal - tap card, enter PIN, complete transaction*

### Transaction Confirmation

![Transaction Success](https://github.com/user-attachments/assets/b0c4ed6c-caec-4f49-8f36-b793de7ec661)

*Real-time transaction confirmation with receipt details*

### NFC Card Setup
![NFC Card Writing](https://github.com/user-attachments/assets/dc1424d9-bd21-4462-892a-a906151583ce)

*Physical NFC card with StarSwipe data written using NFC Tools app*

---

## 📋 Table of Contents

- [Features](#-features)
- [How It Works](#-how-it-works)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Security](#-security)
- [Smart Contract](#-smart-contract)
- [Installation Guide](#-installation-guide)
- [API Documentation](#-api-documentation)
- [Future Roadmap](#-future-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Current Features (MVP)

- **🎴 Card Registration**: Register NFC cards linked to your Stellar wallet
- **💳 Tap-to-Pay**: Pay merchants by simply tapping your NFC card
- **💰 Card Top-Up**: Transfer XLM from wallet to card via NFC tap
- **🔐 Secure Storage**: Shamir's Secret Sharing protects card credentials
- **📊 Real-time Balance**: Check card balance and transaction status
- **🔄 Wallet Connection**: Seamless integration with Freighter wallet (Desktop & Mobile via WalletConnect)
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices
- **⚡ Instant Transactions**: Powered by Stellar's 5-second settlement
- **🌐 Testnet Deployment**: Fully functional on Stellar Testnet

### Key Innovations

- **SSS Encryption**: Card secrets are split into shares, protecting against theft and database breaches
- **NFC Integration**: Ultra-compact data encoding (125 bytes) fits perfectly in NFC tags
- **Multi-Platform Support**: Desktop (Freighter extension) and Mobile (WalletConnect)
- **Daily Limits**: Built-in spending limits for additional security

---

## 🔄 How It Works

### User Journey

1. **Connect Wallet** 
   - Desktop: Connect via Freighter browser extension
   - Mobile: Connect via WalletConnect (Freighter mobile app)

2. **Register Card**
   - Enter daily spending limit and 4-digit PIN
   - System generates card address using SSS algorithm
   - Write credentials to NFC card (125 bytes)

3. **Top Up Card**
   - Tap NFC card at terminal
   - Enter amount to transfer
   - Confirm transaction in wallet
   - Funds move from wallet → card address

4. **Make Payment**
   - Merchant enters payment amount
   - User taps NFC card
   - Enters PIN for verification
   - Payment processes instantly (5 seconds)
   - Funds move from card → merchant wallet

5. **Withdraw Funds**
   - Return unused funds from card back to wallet
   - Freeze/unfreeze card anytime

---

## 🏗️ Architecture

```
┌─────────────────┐
│   React dApp    │ ← User Interface
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
┌────────▼────────┐                  ┌────────▼─────────┐
│  Freighter /    │                  │  Express.js      │
│  WalletConnect  │                  │  Backend API     │
└────────┬────────┘                  └────────┬─────────┘
         │                                     │
         │                           ┌─────────▼─────────┐
         │                           │   PostgreSQL DB   │
         │                           │  (Metadata Only)  │
         │                           └───────────────────┘
         │
┌────────▼──────────────────────────────────────┐
│       Stellar Blockchain (Testnet)            │
│                                                │
│  ┌──────────────────────────────────────┐    │
│  │   Soroban Smart Contract             │    │
│  │   (Card Manager)                     │    │
│  │                                      │    │
│  │   • register_card()                  │    │
│  │   • top_up()                         │    │
│  │   • process_transaction()            │    │
│  │   • withdraw()                       │    │
│  │   • set_card_status()                │    │
│  └──────────────────────────────────────┘    │
│                                                │
│  XLM Token Transfers                          │
└────────────────────────────────────────────────┘
         │
         │
┌────────▼────────┐
│   NFC Card      │ ← Physical Payment Card
│  (125 bytes)    │
└─────────────────┘
```

### Data Flow

1. **Frontend** (React): User interface for wallet connection, card registration, and transactions
2. **Backend** (Express.js): Handles SSS encryption/decryption and stores transaction metadata
3. **Database** (PostgreSQL): Stores non-sensitive metadata (card IDs, timestamps, amounts)
4. **Blockchain** (Stellar): Executes smart contract functions and processes XLM transfers
5. **NFC Card**: Stores encrypted card credentials (address + secret share)

---

## 🛠️ Technology Stack

### Frontend
- **React.js** - UI framework
- **TailwindCSS** - Styling
- **@stellar/freighter-api** - Wallet integration (desktop)
- **@walletconnect/sign-client** - Mobile wallet integration
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Secrets.js-grempe** - Shamir's Secret Sharing implementation
- **Stellar SDK** - Blockchain interaction

### Smart Contract
- **Rust** - Programming language
- **Soroban SDK** - Stellar smart contract framework
- **Stellar Blockchain (Testnet)** - Deployment network

### Additional Tools
- **Freighter Wallet** - Stellar wallet (Desktop & Mobile)
- **WalletConnect** - Mobile wallet connection protocol
- **NFC Tools** - NFC card programming
- **Vercel** - Frontend hosting
- **Render** - Backend hosting

---

## 🔐 Security

### Shamir's Secret Sharing (SSS)

StarSwipe uses a **2-of-3** threshold SSS scheme:

1. **Share 1**: Stored on the NFC card
2. **Share 2**: Stored in localStorage (user's device)
3. **Share 3**: Stored in backend database

**To make a payment, you need any 2 of 3 shares:**
- Card (Share 1) + Device (Share 2) ✅
- Card (Share 1) + Database (Share 3) ✅
- Device (Share 2) + Database (Share 3) ✅

**Security Benefits:**
- ✅ Lost card? Attacker only has 1 share (useless)
- ✅ Database breach? Attacker only has 1 share (useless)
- ✅ Device stolen? Attacker only has 1 share (useless)
- ✅ Need 2 shares to reconstruct the secret key

### Additional Security Features

- **PIN Protection**: 4-digit PIN required for transactions
- **Daily Limits**: Customizable spending limits
- **Card Freeze**: Instantly freeze/unfreeze cards
- **Multi-signature**: Card address must sign transactions
- **Network Encryption**: All API calls over HTTPS

---

## 📜 Smart Contract

### Deployed Contract
**Contract ID:** `CDQI6IYM5TIEKLHAPOHJEJIGLQX2TMPGB3FJJCH7B4PFMAU6SRAVTJKZ`

**Network:** Stellar Testnet

### Core Functions

```rust
// Register a new payment card
pub fn register_card(
    env: Env,
    owner: Address,
    card_id: String,
    card_address: Address,
    daily_limit: i128,
) -> Result<(), Error>

// Top up card with XLM
pub fn top_up(
    env: Env,
    owner: Address,
    card_id: String,
    amount: i128,
) -> Result<(), Error>

// Process a payment transaction
pub fn process_transaction(
    env: Env,
    card_address: Address,
    card_id: String,
    amount: i128,
    merchant: Address,
    merchant_id: String,
) -> Result<(), Error>

// Withdraw funds from card to wallet
pub fn withdraw(
    env: Env,
    owner: Address,
    card_id: String,
    amount: i128,
) -> Result<(), Error>

// Freeze/unfreeze card
pub fn set_card_status(
    env: Env,
    owner: Address,
    card_id: String,
    is_active: bool,
) -> Result<(), Error>

// Get card information
pub fn get_card_info(
    env: Env,
    card_id: String,
) -> Result<Card, Error>
```

### Contract Features

- **Daily Spending Limits**: Prevents overspending
- **Auto-Reset**: Daily limits reset after 24 hours
- **Balance Tracking**: Real-time balance updates
- **Event Logging**: All transactions emit events
- **Owner Authorization**: Only card owner can top-up/withdraw

---

## 🚀 Installation Guide

### Prerequisites

- **Node.js** (v16+)
- **Rust & Cargo** (for smart contract)
- **Soroban CLI**
- **PostgreSQL**
- **Freighter Wallet** browser extension or mobile app

### A) Smart Contract Setup

1. **Install Rust:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. **Install Soroban CLI:**
```bash
cargo install --locked soroban-cli
```

3. **Add WASM target:**
```bash
rustup target add wasm32-unknown-unknown
```

4. **Configure Testnet:**
```bash
soroban network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"
```

5. **Generate account:**
```bash
soroban keys generate --global alice --network testnet
```

6. **Build contract:**
```bash
cd smart-contract
soroban contract build
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/card_manager.wasm
```

7. **Deploy contract:**
```bash
# Install and get hash
soroban contract install \
  --source-account alice \
  --wasm target/wasm32-unknown-unknown/release/card_manager.wasm \
  --network testnet

# Deploy using hash
soroban contract deploy \
  --wasm-hash <YOUR_HASH> \
  --source alice \
  --network testnet
```

### B) Backend Setup

1. **Clone repository:**
```bash
git clone <your-repo-url>
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env with your database credentials and contract ID
```

4. **Setup database:**
```bash
# Create PostgreSQL database
createdb starswipe

# Run migrations
npm run migrate
```

5. **Start server:**
```bash
npm start
```

Backend will run on `http://localhost:3000` (or your configured port)

### C) Frontend Setup

1. **Navigate to frontend:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Add your backend API URL and contract ID
```

4. **Start development server:**
```bash
npm start
```

Frontend will run on `http://localhost:3000`

### D) Wallet Setup

**Desktop:**
1. Install [Freighter wallet extension](https://www.freighter.app/)
2. Create/import wallet
3. Switch to Testnet in settings
4. Get test XLM from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)

**Mobile:**
1. Install Freighter mobile app
2. Create/import wallet
3. Switch to Testnet
4. Fund wallet with test XLM

---

## 📡 API Documentation

### Base URL
**Production:** `https://stellarpaybackend.onrender.com/api/v1`
**Local:** `http://localhost:3000/api/v1`

### Endpoints

#### 1. User Registration
```http
POST /users/register
Content-Type: application/json

{
  "walletAddress": "GXXX...",
  "email": "user@example.com"
}

Response: {
  "user": {
    "id": 1,
    "walletAddress": "GXXX...",
    "email": "user@example.com"
  }
}
```

#### 2. Get User by Wallet
```http
GET /users/:walletAddress

Response: {
  "user": {
    "id": 1,
    "walletAddress": "GXXX...",
    "email": "user@example.com"
  }
}
```

#### 3. Prepare Card Registration
```http
POST /cards/prepare-registration
Content-Type: application/json

{
  "userId": 1,
  "cardId": "NFC_CARD_001",
  "pin": "1234",
  "dailyLimit": 100
}

Response: {
  "unsignedTxXDR": "AAAAA...",
  "share2": "hex_encoded_share",
  "cardPublicKey": "GXXX..."
}
```

#### 4. Submit Card Registration
```http
POST /cards/submit-registration
Content-Type: application/json

{
  "signedTxXDR": "AAAAA...",
  "cardId": "NFC_CARD_001"
}

Response: {
  "success": true,
  "txHash": "abc123..."
}
```

#### 5. Prepare Top-Up
```http
POST /cards/prepare-topup
Content-Type: application/json

{
  "cardId": "NFC_CARD_001",
  "amount": 50
}

Response: {
  "unsignedTxXDR": "AAAAA..."
}
```

#### 6. Process Payment
```http
POST /cards/process-payment
Content-Type: application/json

{
  "cardId": "NFC_CARD_001",
  "share2": "hex_encoded_share",
  "pin": "1234",
  "amount": 25,
  "merchantAddress": "GXXX...",
  "merchantId": "MERCHANT_001"
}

Response: {
  "success": true,
  "txHash": "abc123...",
  "remainingBalance": 25
}
```

---

## 🎯 Future Roadmap

### Phase 1: Enhanced User Experience (Q2 2025)
- [ ] **User Dashboard**
  - Transaction history with filters and search
  - Spending analytics and charts
  - Category-wise expense breakdown
  - Monthly/yearly spending reports
  - Export transactions as CSV/PDF
  
- [ ] **Multiple Cards Support**
  - Register multiple NFC cards per wallet
  - Custom names for each card
  - Independent limits per card
  - Bulk card management

- [ ] **Notifications**
  - Real-time transaction alerts
  - Daily spending summaries
  - Low balance warnings
  - Security alerts for suspicious activity

### Phase 2: Advanced Features (Q3 2025)
- [ ] **Multi-Currency Support**
  - Support for USDC, EURC, and other Stellar assets
  - Auto-conversion at point of sale
  - Currency preferences per card

- [ ] **Merchant Dashboard**
  - Accept NFC payments
  - Transaction management
  - Settlement reports
  - QR code payment option

- [ ] **Mobile App**
  - Native iOS/Android apps
  - Built-in NFC writing
  - Biometric authentication
  - Offline transaction queuing

### Phase 3: Enterprise & Integration (Q4 2025)
- [ ] **Merchant Integration SDK**
  - Easy integration for POS systems
  - Payment gateway APIs
  - Webhook notifications
  - Testing sandbox

- [ ] **Loyalty Programs**
  - Cashback rewards
  - Points system
  - Merchant-specific offers
  - Referral bonuses

- [ ] **Advanced Security**
  - Hardware wallet integration (Ledger)
  - Biometric authentication for high-value transactions
  - Geofencing restrictions
  - Spending time restrictions

### Phase 4: Mainnet & Scale (Q1 2026)
- [ ] **Mainnet Deployment**
  - Production smart contracts
  - Real XLM/USDC transactions
  - Enhanced security audits
  - Insurance coverage

- [ ] **Global Expansion**
  - Multi-language support
  - Regional payment methods
  - Compliance with local regulations
  - Partnership with payment processors

- [ ] **DeFi Integration**
  - Earn yield on card balances
  - Auto-invest spare change
  - Integration with Stellar DEX
  - Staking rewards

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation
- Test on both desktop and mobile
- Ensure smart contract changes are audited

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Acknowledgments

- **Stellar Development Foundation** - For the amazing blockchain platform
- **Freighter Team** - For the excellent wallet integration
- **WalletConnect** - For mobile wallet connectivity
- **Soroban Community** - For smart contract development resources

---

## 📞 Contact & Support

- **Website:** [https://stellar-pay-wheat.vercel.app/](https://stellar-pay-wheat.vercel.app/)
- **Backend API:** [https://stellarpaybackend.onrender.com](https://stellarpaybackend.onrender.com)
- **Issues:** [GitHub Issues](your-github-repo/issues)
- **Discord:** [Join our community](#)

---

## 🎬 Demo

Try StarSwipe now:
1. Visit [https://stellar-pay-wheat.vercel.app/](https://stellar-pay-wheat.vercel.app/)
2. Connect your Freighter wallet (Testnet)
3. Register a virtual NFC card
4. Try a test transaction!

---

<p align="center">
  <strong>Built with ❤️ on Stellar Blockchain</strong>
</p>

<p align="center">
  <strong>🌟 If you like this project, please give it a star! 🌟</strong>
</p>
