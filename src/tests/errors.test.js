// src/tests/errors.test.js
// Tests for the 3 custom error types

import {
  WalletNotFoundError,
  TransactionRejectedError,
  InsufficientBalanceError,
  classifyError,
  getErrorUIConfig,
} from '../../src/lib/errors.js';

// Minimal test runner (works without Jest — plain Node)
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, ok: false, error: err.message });
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function expect(val) {
  return {
    toBe(expected) {
      if (val !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
    },
    toContain(str) {
      if (!String(val).includes(str)) throw new Error(`Expected "${val}" to contain "${str}"`);
    },
    toBeInstanceOf(cls) {
      if (!(val instanceof cls)) throw new Error(`Expected instance of ${cls.name}, got ${val?.constructor?.name}`);
    },
    toBeTruthy() {
      if (!val) throw new Error(`Expected truthy, got ${val}`);
    },
    toBeDefined() {
      if (val === undefined) throw new Error('Expected defined value, got undefined');
    },
  };
}

// ─────────────────────────────────────────────────────────
console.log('\n━━━ Error Classes ━━━');
// ─────────────────────────────────────────────────────────

test('WalletNotFoundError has correct name and code', () => {
  const err = new WalletNotFoundError('freighter');
  expect(err.name).toBe('WalletNotFoundError');
  expect(err.code).toBe('WALLET_NOT_FOUND');
  expect(err.walletId).toBe('freighter');
  expect(err.message).toContain('freighter');
});

test('WalletNotFoundError is an instance of Error', () => {
  const err = new WalletNotFoundError();
  expect(err).toBeInstanceOf(Error);
  expect(err).toBeInstanceOf(WalletNotFoundError);
});

test('TransactionRejectedError has correct name and code', () => {
  const err = new TransactionRejectedError('User hit cancel');
  expect(err.name).toBe('TransactionRejectedError');
  expect(err.code).toBe('TRANSACTION_REJECTED');
  expect(err.message).toContain('rejected');
});

test('InsufficientBalanceError stores required/available', () => {
  const err = new InsufficientBalanceError(5, 0.5, 'XLM');
  expect(err.name).toBe('InsufficientBalanceError');
  expect(err.code).toBe('INSUFFICIENT_BALANCE');
  expect(err.required).toBe(5);
  expect(err.available).toBe(0.5);
  expect(err.asset).toBe('XLM');
});

test('InsufficientBalanceError message contains amounts', () => {
  const err = new InsufficientBalanceError(2, 0.1, 'XLM');
  expect(err.message).toContain('2');
  expect(err.message).toContain('0.1');
  expect(err.message).toContain('XLM');
});

// ─────────────────────────────────────────────────────────
console.log('\n━━━ classifyError ━━━');
// ─────────────────────────────────────────────────────────

test('classifyError returns WalletNotFoundError for "not installed" message', () => {
  const raw = new Error('Wallet is not installed');
  const classified = classifyError(raw, 'xbull');
  expect(classified).toBeInstanceOf(WalletNotFoundError);
  expect(classified.walletId).toBe('xbull');
});

test('classifyError returns TransactionRejectedError for "rejected" message', () => {
  const raw = new Error('User rejected the request');
  const classified = classifyError(raw);
  expect(classified).toBeInstanceOf(TransactionRejectedError);
});

test('classifyError returns TransactionRejectedError for code 4001', () => {
  const raw = Object.assign(new Error('denied'), { code: 4001 });
  const classified = classifyError(raw);
  expect(classified).toBeInstanceOf(TransactionRejectedError);
});

test('classifyError returns InsufficientBalanceError for "insufficient" message', () => {
  const raw = new Error('Insufficient balance for transaction');
  const classified = classifyError(raw);
  expect(classified).toBeInstanceOf(InsufficientBalanceError);
});

test('classifyError passes through already-classified errors', () => {
  const err = new WalletNotFoundError('albedo');
  const result = classifyError(err);
  expect(result).toBeInstanceOf(WalletNotFoundError);
  expect(result.walletId).toBe('albedo');
});

// ─────────────────────────────────────────────────────────
console.log('\n━━━ Error UI Config ━━━');
// ─────────────────────────────────────────────────────────

test('getErrorUIConfig returns config for WALLET_NOT_FOUND', () => {
  const cfg = getErrorUIConfig('WALLET_NOT_FOUND');
  expect(cfg.icon).toBeTruthy();
  expect(cfg.label).toBeTruthy();
  expect(cfg.color).toBeTruthy();
});

test('getErrorUIConfig returns default for unknown code', () => {
  const cfg = getErrorUIConfig('TOTALLY_UNKNOWN_CODE');
  expect(cfg.label).toBe('ERROR');
  expect(cfg.icon).toBeTruthy();
});

// ─────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────
console.log(`\n━━━ Results ━━━`);
console.log(`  ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}

export { results, passed, failed };

