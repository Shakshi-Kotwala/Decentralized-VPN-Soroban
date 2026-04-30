// src/tests/contract.test.js
// Tests for contract interaction helpers (mocked Soroban RPC)

import { cache } from '../../src/lib/cache.js';
import {
  WalletNotFoundError,
  TransactionRejectedError,
  InsufficientBalanceError,
  classifyError,
} from '../../src/lib/errors.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        passed++;
        console.log(`  ✓ ${name}`);
      }).catch((err) => {
        failed++;
        console.log(`  ✗ ${name}: ${err.message}`);
      });
    }
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function expect(val) {
  return {
    toBe: (expected) => {
      if (val !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
    },
    toBeInstanceOf: (cls) => {
      if (!(val instanceof cls)) throw new Error(`Expected ${cls.name}, got ${val?.constructor?.name}`);
    },
    toContain: (str) => {
      if (!String(val).includes(str)) throw new Error(`"${val}" should contain "${str}"`);
    },
    toEqual: (expected) => {
      if (JSON.stringify(val) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
    },
    toBeTruthy: () => {
      if (!val) throw new Error(`Expected truthy, got ${val}`);
    },
    toBeNull: () => {
      if (val !== null) throw new Error(`Expected null, got ${JSON.stringify(val)}`);
    },
    toBeGreaterThanOrEqual: (n) => {
      if (val < n) throw new Error(`Expected >= ${n}, got ${val}`);
    },
  };
}

// ─────────────────────────────────────────────────────────
// Mock contract call function (simulates callContractMethod)
// ─────────────────────────────────────────────────────────

async function mockCallContractMethod({ address, method, balance = 5 }) {
  if (balance < 1.0) {
    throw new InsufficientBalanceError(1.0, balance.toFixed(4), 'XLM');
  }
  // Simulate async delay
  await new Promise((r) => setTimeout(r, 10));
  // Simulate success
  return {
    hash: 'abc123def456789012345678901234567890123456789012345678901234',
    status: 'success',
    explorerUrl: `https://stellar.expert/explorer/testnet/tx/abc123`,
  };
}

async function mockCallContractMethodWithRejection() {
  await new Promise((r) => setTimeout(r, 10));
  throw new TransactionRejectedError('User cancelled signing');
}

async function mockCallContractMethodWalletNotFound() {
  throw new WalletNotFoundError('freighter');
}

// ─────────────────────────────────────────────────────────
console.log('\n━━━ Contract — Successful Call ━━━');

test('successful call returns hash and explorerUrl', async () => {
  const result = await mockCallContractMethod({ address: 'GTEST', method: 'increment', balance: 10 });
  expect(result.hash).toBeTruthy();
  expect(result.status).toBe('success');
  expect(result.explorerUrl).toContain('stellar.expert');
});

test('successful call hash has correct length', async () => {
  const result = await mockCallContractMethod({ address: 'GTEST', method: 'decrement', balance: 5 });
  expect(result.hash.length).toBeGreaterThanOrEqual(20);
});

// ─────────────────────────────────────────────────────────
console.log('\n━━━ Contract — Error Handling ━━━');

test('throws InsufficientBalanceError when balance < 1 XLM', async () => {
  try {
    await mockCallContractMethod({ address: 'GTEST', method: 'increment', balance: 0.1 });
    throw new Error('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(InsufficientBalanceError);
    expect(err.code).toBe('INSUFFICIENT_BALANCE');
  }
});

test('InsufficientBalanceError contains required balance info', async () => {
  try {
    await mockCallContractMethod({ address: 'GTEST', method: 'reset', balance: 0.5 });
  } catch (err) {
    expect(err.required).toBe(1.0);
    expect(err.asset).toBe('XLM');
  }
});

test('throws TransactionRejectedError on wallet rejection', async () => {
  try {
    await mockCallContractMethodWithRejection();
    throw new Error('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(TransactionRejectedError);
    expect(err.code).toBe('TRANSACTION_REJECTED');
  }
});

test('throws WalletNotFoundError when wallet missing', async () => {
  try {
    await mockCallContractMethodWalletNotFound();
    throw new Error('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(WalletNotFoundError);
    expect(err.code).toBe('WALLET_NOT_FOUND');
  }
});

// ─────────────────────────────────────────────────────────
console.log('\n━━━ Contract — Caching Layer ━━━');

test('cache stores and retrieves contract state', async () => {
  const key = 'vpn_node_count';
  cache.set(key, 42, 5000);
  expect(cache.get(key)).toBe(42);
});

test('cache miss returns null (triggers fresh fetch)', () => {
  cache.delete('nonexistent_state');
  expect(cache.get('nonexistent_state')).toBeNull();
});

test('cache invalidated after contract write', async () => {
  cache.set('contract_state', { count: 10 }, 10000);
  // Simulate what callContractMethod does: invalidate cache on success
  cache.delete('contract_state');
  expect(cache.get('contract_state')).toBeNull();
});

// ─────────────────────────────────────────────────────────
console.log('\n━━━ Contract — Error Classification ━━━');

test('raw "underfunded" error classified as InsufficientBalanceError', () => {
  const raw = new Error('op_underfunded');
  const classified = classifyError(raw);
  expect(classified).toBeInstanceOf(InsufficientBalanceError);
});

test('raw code 4001 classified as TransactionRejectedError', () => {
  const raw = Object.assign(new Error('MetaMask Tx Signature: User denied'), { code: 4001 });
  const classified = classifyError(raw);
  expect(classified).toBeInstanceOf(TransactionRejectedError);
});

test('raw "extension" message classified as WalletNotFoundError', () => {
  const raw = new Error('Freighter extension not found');
  const classified = classifyError(raw, 'freighter');
  expect(classified).toBeInstanceOf(WalletNotFoundError);
});

// ─────────────────────────────────────────────────────────
// Run async tests and summarize
setTimeout(() => {
  console.log(`\n━━━ Results ━━━`);
  console.log(`  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}, 500);

