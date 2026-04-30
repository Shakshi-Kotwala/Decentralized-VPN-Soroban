// src/tests/cache.test.js
// Tests for the cache module

import { Cache, cache } from '../../src/lib/cache.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
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
    toEqual: (expected) => {
      if (JSON.stringify(val) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
    },
    toBeNull: () => {
      if (val !== null) throw new Error(`Expected null, got ${JSON.stringify(val)}`);
    },
    toBeGreaterThan: (n) => {
      if (val <= n) throw new Error(`Expected > ${n}, got ${val}`);
    },
    toBeTruthy: () => {
      if (!val) throw new Error(`Expected truthy, got ${val}`);
    },
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────
console.log('\n━━━ Cache — Basic Operations ━━━');

const c = new Cache();

test('set and get a string value', () => {
  c.set('key1', 'hello', 5000);
  expect(c.get('key1')).toBe('hello');
});

test('set and get a number value', () => {
  c.set('balance', 42.5, 5000);
  expect(c.get('balance')).toBe(42.5);
});

test('set and get an object value', () => {
  const obj = { address: 'GABCD', balance: '10.5' };
  c.set('account', obj, 5000);
  expect(c.get('account')).toEqual(obj);
});

test('has() returns true for existing key', () => {
  c.set('exists', true, 5000);
  expect(c.has('exists')).toBe(true);
});

test('has() returns false for missing key', () => {
  expect(c.has('does_not_exist')).toBe(false);
});

test('get() returns null for missing key', () => {
  expect(c.get('missing')).toBeNull();
});

test('delete() removes a key', () => {
  c.set('to_delete', 'bye', 5000);
  c.delete('to_delete');
  expect(c.get('to_delete')).toBeNull();
});

test('clear() removes all keys', () => {
  const fresh = new Cache();
  fresh.set('a', 1, 5000);
  fresh.set('b', 2, 5000);
  fresh.clear();
  expect(fresh.size()).toBe(0);
});

test('size() reflects number of entries', () => {
  const fresh = new Cache();
  fresh.set('x', 1, 5000);
  fresh.set('y', 2, 5000);
  expect(fresh.size()).toBe(2);
});

test('overwriting a key updates the value', () => {
  c.set('overwrite', 'first', 5000);
  c.set('overwrite', 'second', 5000);
  expect(c.get('overwrite')).toBe('second');
});

test('ttlRemaining() returns positive for live key', () => {
  c.set('ttl_check', 'x', 10000);
  expect(c.ttlRemaining('ttl_check')).toBeGreaterThan(0);
});

test('ttlRemaining() returns 0 for missing key', () => {
  expect(c.ttlRemaining('not_here')).toBe(0);
});

// ─────────────────────────────────────────────────────────
console.log('\n━━━ Cache — TTL Expiry ━━━');

test('get() returns null after TTL expires', async () => {
  const fresh = new Cache();
  fresh.set('expiring', 'soon', 50); // 50ms TTL
  await sleep(100);
  expect(fresh.get('expiring')).toBeNull();
});

test('value is accessible before TTL expires', async () => {
  const fresh = new Cache();
  fresh.set('live', 'yes', 500);
  await sleep(50);
  expect(fresh.get('live')).toBe('yes');
});

// ─────────────────────────────────────────────────────────
console.log('\n━━━ Cache — Singleton ━━━');

test('exported cache singleton works', () => {
  cache.set('singleton_test', 'works', 5000);
  expect(cache.get('singleton_test')).toBe('works');
  cache.delete('singleton_test');
});

// ─────────────────────────────────────────────────────────
console.log(`\n━━━ Results ━━━`);
console.log(`  ${passed} passed, ${failed} failed\n`);

if (failed > 0) process.exit(1);

