// src/lib/contract.js
// Soroban contract call helpers — read, write, event fetching

import * as StellarSdk from '@stellar/stellar-sdk';
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE, signTransaction } from './walletKit.js';
import {
  classifyError,
  InsufficientBalanceError,
  WalletNotFoundError,
} from './errors.js';
import { getAccountBalance } from './walletKit.js';
import { cache } from './cache.js';

// ── Contract address (update after deployment) ──────────
export const CONTRACT_ID =
  import.meta.env?.VITE_CONTRACT_ID ||
  'CDMLFMKMMD6NFLBMKDWLPAO45NDPAMSP3P5LVUQXDM3RBDLRXSPLFTQN';

export const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet';

export const sorobanServer = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);

// ── Explorer URL helpers ────────────────────────────────
export const txExplorerUrl = (hash) => `${EXPLORER_BASE}/tx/${hash}`;
export const contractExplorerUrl = () => `${EXPLORER_BASE}/contract/${CONTRACT_ID}`;

// ── Minimum XLM needed to submit a tx ──────────────────
const MIN_BALANCE_FOR_TX = 1.0;

// ── Core call function ──────────────────────────────────
export async function callContractMethod({ address, method, args = [] }) {
  // 1. Balance check
  const balance = parseFloat(await getAccountBalance(address));
  if (balance < MIN_BALANCE_FOR_TX) {
    throw new InsufficientBalanceError(MIN_BALANCE_FOR_TX, balance.toFixed(4), 'XLM');
  }

  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const account = await sorobanServer.getAccount(address);

    // 2. Build transaction
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    // 3. Simulate
    const simResult = await sorobanServer.simulateTransaction(tx);
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    // 4. Assemble
    const assembled = StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build();

    // 5. Sign (wallet popup)
    const signedXdr = await signTransaction(assembled.toXDR(), address);

    // 6. Submit
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const sendResult = await sorobanServer.sendTransaction(signedTx);

    if (sendResult.status === 'ERROR') {
      throw new Error(`Submission failed: ${JSON.stringify(sendResult.errorResult)}`);
    }

    // 7. Poll for confirmation
    const confirmed = await pollForConfirmation(sendResult.hash);

    // Invalidate cached contract state
    cache.delete('contract_state');

    return {
      hash: sendResult.hash,
      status: 'success',
      explorerUrl: txExplorerUrl(sendResult.hash),
      result: confirmed,
    };
  } catch (err) {
    throw classifyError(err, null);
  }
}

// ── Poll until confirmed ────────────────────────────────
export async function pollForConfirmation(hash, maxAttempts = 20, delayMs = 1500) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(delayMs);
    const result = await sorobanServer.getTransaction(hash);

    if (result.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return result;
    }
    if (result.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed on-chain: ${hash}`);
    }
    // NOT_FOUND = still pending, keep polling
  }
  throw new Error(`Transaction timed out after ${maxAttempts} attempts: ${hash}`);
}

// ── Read contract state (no signature needed) ───────────
export async function readContractState(method, args = [], cacheKey = null, ttlMs = 10000) {
  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached !== null) return cached;
  }

  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    // Use a throwaway keypair for simulation
    const dummyKeypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(dummyKeypair.publicKey(), '0');

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simResult = await sorobanServer.simulateTransaction(tx);
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) return null;

    const value = simResult.result?.retval;
    const parsed = parseScVal(value);

    if (cacheKey) cache.set(cacheKey, parsed, ttlMs);
    return parsed;
  } catch {
    return null;
  }
}

// ── Fetch contract events ───────────────────────────────
export async function fetchContractEvents(startLedger = 1000000, limit = 25) {
  try {
    const response = await sorobanServer.getEvents({
      startLedger,
      filters: [{ type: 'contract', contractIds: [CONTRACT_ID] }],
      limit,
    });
    return response.events || [];
  } catch (err) {
    console.warn('Event fetch error:', err.message);
    return [];
  }
}

// ── Parse ScVal to JS ───────────────────────────────────
function parseScVal(val) {
  if (!val) return null;
  try {
    switch (val.switch().name) {
      case 'scvU32': return val.u32();
      case 'scvI32': return val.i32();
      case 'scvU64': return Number(val.u64());
      case 'scvI64': return Number(val.i64());
      case 'scvBool': return val.b();
      case 'scvString': return val.str().toString();
      case 'scvSymbol': return val.sym().toString();
      default: return val.value();
    }
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
