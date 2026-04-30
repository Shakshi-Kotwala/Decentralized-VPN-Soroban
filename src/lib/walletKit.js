// src/lib/walletKit.js
// StellarWalletsKit integration — supports Freighter, xBull, LOBSTR, Albedo

import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  XBULL_ID,
  LOBSTR_ID,
  ALBEDO_ID,
} from '@creit.tech/stellar-wallets-kit';
import { classifyError, WalletNotFoundError, TransactionRejectedError } from './errors.js';

// ─── Network Config ─────────────────────────────────────
export const NETWORK = WalletNetwork.TESTNET;
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

// ─── Kit singleton ──────────────────────────────────────
let _kit = null;

export function getKit() {
  if (!_kit) {
    _kit = new StellarWalletsKit({
      network: NETWORK,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return _kit;
}

// ─── Available wallets list (for the selector UI) ───────
export const AVAILABLE_WALLETS = [
  {
    id: FREIGHTER_ID,
    name: 'Freighter',
    description: 'Official Stellar browser extension',
    icon: '🚀',
    accentColor: '#7B40F2',
    installUrl: 'https://freighter.app',
  },
  {
    id: XBULL_ID,
    name: 'xBull Wallet',
    description: 'Feature-rich Stellar wallet',
    icon: '🐂',
    accentColor: '#E84142',
    installUrl: 'https://xbull.app',
  },
  {
    id: LOBSTR_ID,
    name: 'LOBSTR',
    description: 'Simple & secure mobile wallet',
    icon: '🦞',
    accentColor: '#7B00FF',
    installUrl: 'https://lobstr.co',
  },
  {
    id: ALBEDO_ID,
    name: 'Albedo',
    description: 'Web-based signer, no install needed',
    icon: '🌙',
    accentColor: '#1e88e5',
    installUrl: 'https://albedo.link',
  },
];

// ─── Connect a wallet ───────────────────────────────────
export async function connectWallet(walletId) {
  try {
    const kit = getKit();
    kit.setWallet(walletId);
    const { address } = await kit.getAddress();
    if (!address) throw new WalletNotFoundError(walletId);
    return { address, walletId };
  } catch (err) {
    throw classifyError(err, walletId);
  }
}

// ─── Sign a transaction XDR ─────────────────────────────
export async function signTransaction(xdr, address) {
  try {
    const kit = getKit();
    const result = await kit.signTransaction(xdr, {
      network: NETWORK,
      networkPassphrase: NETWORK_PASSPHRASE,
      address,
    });
    return result.signedTxXdr;
  } catch (err) {
    const classified = classifyError(err);
    if (classified instanceof TransactionRejectedError) throw classified;
    throw classified;
  }
}

// ─── Get account balance from Horizon ───────────────────
export async function getAccountBalance(address) {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (!res.ok) return '0.0000';
    const data = await res.json();
    const xlmBalance = data.balances?.find((b) => b.asset_type === 'native');
    return xlmBalance ? parseFloat(xlmBalance.balance).toFixed(4) : '0.0000';
  } catch {
    return '0.0000';
  }
}

// ─── Friendbot (testnet faucet) ─────────────────────────
export async function requestFriendbot(address) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error('Friendbot request failed. The account may already be funded.');
  return res.json();
}

// ─── Format helpers ─────────────────────────────────────
export function shortAddress(addr) {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}
