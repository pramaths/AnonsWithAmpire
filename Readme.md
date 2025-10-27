# EV Charging Token Platform 🚗⚡

A decentralized platform that enables EV drivers to earn blockchain tokens for charging their vehicles and sell them to Web3 users through a peer-to-peer marketplace.

## 🌟 Overview

This platform creates a sustainable ecosystem where:
- **EV Drivers** earn DECH tokens for charging their vehicles
- **Web3 Users** can buy these tokens directly from drivers
- **Transparent** on-chain recording of all charging sessions
- **Decentralized** peer-to-peer trading without intermediaries

## 🏗️ Architecture

### Smart Contract (Solana Program)
- **Program ID**: `5V11nhm8AMcC8nn1VmyjqXvwLms5pGJVdVSco7FsahwX`
- **Platform State**: `6QQzocqdvf6yqk7kkSXvxDy9LR3FE9MfpBjwK85jw3kU`
- **Mint Account**: `Es1SZLqTFfTWSZo9JacYp6qRW8qcXAh9RiN39BvFJttR`

### Key Components

#### 1. **Solana Program** (`/ev/`)
- **Rust-based Anchor program** with 5 main instructions
- **SPL Token integration** for DECH token management
- **PDA-based architecture** for secure, predictable addresses
- **Event emission** for real-time session tracking

#### 2. **Backend API** (`/backend/`)
- **Express.js server** with TypeScript
- **Solana RPC integration** for blockchain interactions
- **RESTful API** for frontend communication
- **Session management** for real-time charging tracking

#### 3. **Frontend** (`/frontend/`)
- **Next.js 15** with React 19
- **Solana wallet integration** (Phantom, Solflare, etc.)
- **Real-time UI** with live session updates
- **Responsive design** with Tailwind CSS

## 🔧 Core Features

### For EV Drivers
1. **Automatic Registration**: Drivers are registered when they start their first session
2. **Token Earning**: Earn DECH tokens based on energy consumed (1000 milli-kWh = 1 DECH)
3. **Price Setting**: Set custom price per DECH token (default: 0.1 SOL/DECH)
4. **Approval System**: Approve platform access to enable token selling
5. **Session Tracking**: Real-time charging session monitoring

### For Web3 Users
1. **Driver Marketplace**: Browse available drivers with approval status
2. **Price Transparency**: See exact pricing before purchase
3. **Direct Trading**: Buy tokens directly from drivers (no escrow)
4. **Token Management**: View and manage purchased DECH tokens

### Platform Features
1. **Sustainability Tracking**: Monitor total energy delivered and CO2 saved
2. **Session Analytics**: Track charging patterns and statistics
3. **Real-time Updates**: Live session status and token balances
4. **Security**: SPL token delegation for trustless transfers

## 📊 Smart Contract Instructions

### 1. `initialize_platform`
- Initializes the platform with admin and fee configuration
- Creates the DECH token mint with PDA-controlled authority
- Sets up platform state and mint authority

### 2. `register_driver`
- Registers a new EV driver in the system
- Sets initial pricing and statistics
- Creates driver account with unique PDA

### 3. `approve_platform_access`
- Enables/disables token selling through delegation
- Uses SPL token `approve` for secure delegation
- Drivers maintain full custody of their tokens

### 4. `record_session`
- Records charging sessions and mints tokens
- Updates driver statistics (energy, points, sessions)
- Emits `SessionRecorded` event for transparency

### 5. `buy_points`
- Enables peer-to-peer token trading
- Uses delegated authority for trustless transfers
- Transfers SOL to driver, tokens to buyer

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Solana CLI tools
- Anchor framework
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd anonswithampire
```

### 2. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

#### Solana Program
```bash
cd ev
yarn install
```

### 3. Environment Setup

#### Backend Environment Variables
Create `backend/.env`:
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=5V11nhm8AMcC8nn1VmyjqXvwLms5pGJVdVSco7FsahwX
ADMIN_KEYPAIR_PATH=/path/to/admin-keypair.json
```

#### Frontend Environment Variables
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_PROGRAM_ID=5V11nhm8AMcC8nn1VmyjqXvwLms5pGJVdVSco7FsahwX
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

### 4. Deploy Smart Contract
```bash
cd ev
anchor build
anchor deploy
```

### 5. Start Services

#### Backend Server
```bash
cd backend
npm run dev
```

#### Frontend Application
```bash
cd frontend
npm run dev
```

## 🔌 API Endpoints

### Session Management
- `POST /api/sessions/start` - Start charging session
- `POST /api/sessions/end` - End charging session
- `GET /api/sessions/status/:sessionId` - Get session status

### Driver Operations
- `GET /api/drivers` - Get all drivers
- `POST /api/drivers/approve-transaction` - Create approval transaction
- `POST /api/drivers/buy-points` - Create buy points transaction

### Platform Data
- `GET /api/sustainability-insights` - Get sustainability metrics
- `GET /api/config` - Get platform configuration

## 💡 Usage Examples

### Starting a Charging Session
```javascript
const response = await fetch('/api/sessions/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    driverPublicKey: 'your-wallet-address',
    chargerCode: 'charger-001'
  })
});
```

### Buying Tokens from Driver
```javascript
const response = await fetch('/api/drivers/buy-points', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    buyerPublicKey: 'buyer-wallet-address',
    driverPublicKey: 'driver-wallet-address',
    amount: 100 // DECH tokens
  })
});
```

## 🔒 Security Features

### Token Delegation
- Drivers delegate tokens to platform authority PDA
- Platform can only transfer up to delegated amount
- Drivers can revoke delegation at any time

### PDA Architecture
- Predictable program-derived addresses
- No private key storage required
- Secure signing with seed phrases

### Validation Checks
- Driver must be active for trading
- Sufficient token balance verification
- Proper authority validation

## 📈 Tokenomics

### DECH Token
- **Name**: Decentralized Energy Charging Token
- **Symbol**: DECH
- **Decimals**: 6
- **Mint Authority**: Platform-controlled PDA

### Earning Rate
- **Formula**: `points = energy_milli_kwh * 1000`
- **Example**: 1000 milli-kWh = 1,000,000 DECH tokens
- **Display**: 1,000,000 tokens = 1.0 DECH (with 6 decimals)

### Pricing
- **Default**: 0.1 SOL per DECH token
- **Customizable**: Each driver sets their own price
- **Market-driven**: Supply and demand determine actual prices

## 🌱 Sustainability Impact

### Metrics Tracked
- **Total Energy Delivered**: kWh of clean energy
- **CO2 Emissions Saved**: Estimated carbon footprint reduction
- **Charging Sessions**: Number of completed sessions

### Environmental Benefits
- **Clean Energy Incentives**: Rewards for using renewable energy
- **Carbon Footprint Reduction**: Transparent CO2 savings tracking
- **Sustainable Transportation**: Encourages EV adoption

## 🛠️ Development

### Project Structure
```
anonswithampire/
├── ev/                    # Solana program (Rust/Anchor)
│   ├── programs/ev/      # Main program code
│   ├── tests/            # Integration tests
│   └── migrations/       # Deployment scripts
├── backend/              # Express.js API server
│   ├── controllers/      # API route handlers
│   ├── ev.ts            # Generated program types
│   └── index.ts         # Server entry point
├── frontend/            # Next.js web application
│   ├── app/             # App router pages
│   ├── components/      # React components
│   └── lib/             # Utility functions
└── README.md           # This file
```

### Testing
```bash
# Run Solana program tests
cd ev
anchor test

# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Build Solana program
cd ev
anchor build --release

# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

## 🚀 Deployment

### Smart Contract Deployment
```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta
```

### Backend Deployment
- Deploy to Vercel, Railway, or similar platform
- Set environment variables in deployment dashboard
- Ensure RPC endpoint is accessible

### Frontend Deployment
- Deploy to Vercel, Netlify, or similar platform
- Update environment variables for production
- Configure custom domain if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and code comments
- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Basic charging session tracking
- ✅ Token earning and minting
- ✅ Driver marketplace
- ✅ Peer-to-peer trading

### Phase 2 (Planned)
- 🔄 Advanced pricing mechanisms
- 🔄 Driver reputation system
- 🔄 Batch trading capabilities
- 🔄 Mobile application

### Phase 3 (Future)
- 🔄 Integration with real charging stations
- 🔄 Cross-chain token support
- 🔄 Advanced analytics dashboard
- 🔄 Community governance

---

**Built with ❤️ for the decentralized future of sustainable transportation**