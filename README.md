# 🌐 Decentralized VPN — Full Stack dApp

> A blockchain-powered decentralized VPN on **Stellar Soroban** with Freighter wallet integration.

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue)](https://stellar.org)
[![Network](https://img.shields.io/badge/Network-Testnet-orange)](https://stellar.expert/explorer/testnet)
[![Contract](https://img.shields.io/badge/Contract-CCASXTFSH64E...DXTW-green)](https://stellar.expert/explorer/testnet/contract/CCASXTFSH64EVAK4UWUW6SN2MUYZZWKCNK2W3I3RFH7NZ6QO3YFJDXTW)

---

## 📋 Contract Details

| Field | Value |
|-------|-------|
| **Contract ID** | `CCASXTFSH64EVAK4UWUW6SN2MUYZZWKCNK2W3I3RFH7NZ6QO3YFJDXTW` |
| **Network** | Stellar Testnet |
| **Language** | Rust (Soroban SDK) |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCASXTFSH64EVAK4UWUW6SN2MUYZZWKCNK2W3I3RFH7NZ6QO3YFJDXTW) |

### Contract Functions

| Function | Type | Description |
|----------|------|-------------|
| `subscribe(user: Address)` | Write | Register a user as subscribed |
| `is_subscribed(user: Address) → bool` | Read | Check subscription status |
| `register_node(provider: Address, endpoint: Symbol)` | Write | Register VPN node endpoint |
| `get_node(provider: Address) → Symbol` | Read | Get provider's node endpoint |

---

## 🗂 Project Structure

```
stellar-fullstack/
├── frontend/                    # React + Vite dApp
│   └── src/
│       ├── lib/
│       │   ├── contract.config.ts    # ← Contract address & network config
│       │   ├── vpnContract.ts        # ← All contract function wrappers
│       │   └── stellar.ts            # ← Low-level Stellar SDK helpers
│       ├── hooks/
│       │   └── useWallet.ts          # ← Freighter wallet Zustand store
│       ├── pages/
│       │   ├── DashboardPage.tsx     # ← Main UI: subscribe, register node
│       │   └── IDEPage.tsx           # ← Contract IDE with Monaco editor
│       └── components/
│           ├── Layout.tsx            # ← Topbar + navigation
│           └── WalletButton.tsx      # ← Connect / disconnect wallet
│
├── backend/                     # Express API server
│   └── src/
│       └── index.ts             # ← All REST endpoints
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- [Freighter Wallet](https://freighter.app) browser extension
- (Optional) Stellar CLI for direct contract invocation

### 1. Install dependencies

```bash
cd stellar-fullstack
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. Start development

```bash
# From root — starts both frontend (port 3000) and backend (port 4000)
npm run dev

# Or separately:
cd frontend && npm run dev     # → http://localhost:3000
cd backend && npm run dev      # → http://localhost:4000
```

### 3. Connect Freighter

1. Install [Freighter](https://freighter.app) from the Chrome Web Store
2. Create/import a Stellar wallet
3. **Switch to Testnet**: Settings → Network → Testnet
4. Fund your testnet account: [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=test)
5. Click **Connect Freighter** in the dApp

---

## 🔧 Stellar CLI Integration

### Install Stellar CLI

```bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install --locked stellar-cli --features opt
```

### Configure CLI for Testnet

```bash
# Add testnet network
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate or import your identity
stellar keys generate --global mykey --network testnet

# Fund account (testnet only)
stellar keys fund mykey --network testnet

# Check balance
stellar keys address mykey
```

### Link Freighter Wallet to CLI

```bash
# Get your Freighter public key from the extension
# Then import it as an identity:
stellar keys add freighter-wallet \
  --secret-key YOUR_SECRET_KEY_FROM_FREIGHTER \
  --network testnet
```

### Invoke Contract via CLI

```bash
export CONTRACT=CCASXTFSH64EVAK4UWUW6SN2MUYZZWKCNK2W3I3RFH7NZ6QO3YFJDXTW
export IDENTITY=mykey   # or freighter-wallet

# ── subscribe ──────────────────────────────────────────────────────────────────
stellar contract invoke \
  --id $CONTRACT \
  --source $IDENTITY \
  --network testnet \
  -- subscribe \
  --user $(stellar keys address $IDENTITY)

# ── is_subscribed ──────────────────────────────────────────────────────────────
stellar contract invoke \
  --id $CONTRACT \
  --source $IDENTITY \
  --network testnet \
  -- is_subscribed \
  --user $(stellar keys address $IDENTITY)

# ── register_node ──────────────────────────────────────────────────────────────
stellar contract invoke \
  --id $CONTRACT \
  --source $IDENTITY \
  --network testnet \
  -- register_node \
  --provider $(stellar keys address $IDENTITY) \
  --endpoint vpn-node-1

# ── get_node ───────────────────────────────────────────────────────────────────
stellar contract invoke \
  --id $CONTRACT \
  --source $IDENTITY \
  --network testnet \
  -- get_node \
  --provider $(stellar keys address $IDENTITY)
```

---

## 🌐 Backend API Reference

Base URL: `http://localhost:4000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health + contract info |
| `GET` | `/api/contract` | Contract ABI metadata |
| `GET` | `/api/account/:address` | Balance + subscription + node status |
| `GET` | `/api/simulate/:method` | Read-only simulation (is_subscribed, get_node) |
| `POST` | `/api/prepare` | Build XDR for Freighter signing |
| `POST` | `/api/submit` | Submit signed XDR to Stellar |

### Example API calls

```bash
# Health check
curl http://localhost:4000/api/health

# Check account state
curl http://localhost:4000/api/account/GXXXXXX...

# Simulate is_subscribed
curl "http://localhost:4000/api/simulate/is_subscribed?address=GXXX&callerAddress=GXXX"

# Prepare subscribe transaction (returns XDR for Freighter)
curl -X POST http://localhost:4000/api/prepare \
  -H "Content-Type: application/json" \
  -d '{"method":"subscribe","callerAddress":"GXXX..."}'

# Submit signed XDR
curl -X POST http://localhost:4000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"signedXdr":"AAAA..."}'
```

---

## 🏗 Frontend Architecture

```
Freighter Extension
       │
       │ signTransaction(xdr)
       ▼
useWallet (Zustand)
       │
       │ publicKey, signTransaction
       ▼
vpnContract.ts
  ├── buildSubscribeTx()        → XDR for signing
  ├── buildRegisterNodeTx()     → XDR for signing
  ├── isSubscribed()            → bool (simulate only)
  └── getNode()                 → string | null (simulate only)
       │
       │ Soroban RPC
       ▼
Stellar Testnet
  └── Contract: CCASXTFSH64EVAK4...DXTW
```

---

## 🔄 Transaction Flow

```
User clicks "Subscribe"
        │
        ▼
buildSubscribeTx(publicKey)          ← builds XDR via Soroban RPC simulation
        │
        ▼
signTransaction(xdr)                 ← Freighter popup appears
        │
        ▼
submitSignedXdr(signedXdr)           ← submits to Stellar
        │
        ▼
poll rpc.getTransaction(hash)        ← waits for confirmation
        │
        ▼
✓ Confirmed on-chain!
```

---

## 🚢 Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel, Netlify, etc.
```

### Backend (Railway / Render)

```bash
cd backend
npm run build
# Deploy dist/ — set PORT env var
```

### Environment Variables

```env
# backend/.env (optional — defaults are set in code)
PORT=4000
```

---

## 🔗 Useful Links

- [Stellar Expert Contract](https://stellar.expert/explorer/testnet/contract/CCASXTFSH64EVAK4UWUW6SN2MUYZZWKCNK2W3I3RFH7NZ6QO3YFJDXTW)
- [Freighter Wallet](https://freighter.app)
- [Stellar Laboratory](https://laboratory.stellar.org)
- [Soroban Docs](https://soroban.stellar.org/docs)
- [StellarIDE](https://stellaride.vercel.app/ide)
- [GitHub Source](https://github.com/Shakshi-Kotwala/Decentralized-VPN)

---

## 👩‍💻 Author

Shakshi Kotwala
<img width="1907" height="966" alt="Screenshot 2026-03-20 211947" src="https://github.com/user-attachments/assets/35697106-8d53-43fe-ba5d-c6308f95d710" />
<img width="1919" height="977" alt="Screenshot 2026-03-20 212800" src="https://github.com/user-attachments/assets/7ae1c8c2-fd11-4861-8b52-5348d6b194d0" />

