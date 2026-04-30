// src/lib/cache.js
// Simple in-memory TTL cache with localStorage persistence for contract state

class Cache {
  constructor() {
    this._store = new Map();
    this._timers = new Map();
  }

  set(key, value, ttlMs = 30000) {
    // Clear any existing timer
    if (this._timers.has(key)) {
      clearTimeout(this._timers.get(key));
    }

    const entry = {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    };
    this._store.set(key, entry);

    // Auto-evict after TTL
    const timer = setTimeout(() => {
      this._store.delete(key);
      this._timers.delete(key);
    }, ttlMs);

    this._timers.set(key, timer);
    return this;
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    if (this._timers.has(key)) {
      clearTimeout(this._timers.get(key));
      this._timers.delete(key);
    }
    return this._store.delete(key);
  }

  clear() {
    for (const timer of this._timers.values()) clearTimeout(timer);
    this._timers.clear();
    this._store.clear();
  }

  size() {
    return this._store.size;
  }

  // Get all keys (useful for debugging)
  keys() {
    return [...this._store.keys()];
  }

  // TTL remaining in ms for a key
  ttlRemaining(key) {
    const entry = this._store.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.expiresAt - Date.now());
  }
}

// Export a singleton

// ── Persistent cache layer (for balance, contract state) ─
// Uses localStorage when available, falls back to in-memory
export class PersistentCache {
  constructor(namespace = 'dvpn_cache') {
    this.ns = namespace;
    this._mem = new Cache();
    this._available = this._checkStorage();
  }

  _checkStorage() {
    try {
      localStorage.setItem('__test__', '1');
      localStorage.removeItem('__test__');
      return true;
    } catch {
      return false;
    }
  }

  _key(key) {
    return `${this.ns}:${key}`;
  }

  set(key, value, ttlMs = 60000) {
    this._mem.set(key, value, ttlMs);
    if (this._available) {
      try {
        localStorage.setItem(
          this._key(key),
          JSON.stringify({ value, expiresAt: Date.now() + ttlMs })
        );
      } catch {
        // Storage quota exceeded — ignore
      }
    }
  }

  get(key) {
    // Try in-memory first (fastest)
    const memVal = this._mem.get(key);
    if (memVal !== null) return memVal;

    // Fall back to localStorage
    if (this._available) {
      try {
        const raw = localStorage.getItem(this._key(key));
        if (!raw) return null;
        const { value, expiresAt } = JSON.parse(raw);
        if (Date.now() > expiresAt) {
          localStorage.removeItem(this._key(key));
          return null;
        }
        // Warm in-memory cache
        this._mem.set(key, value, expiresAt - Date.now());
        return value;
      } catch {
        return null;
      }
    }
    return null;
  }

  delete(key) {
    this._mem.delete(key);
    if (this._available) {
      try { localStorage.removeItem(this._key(key)); } catch {}
    }
  }

  clear() {
    this._mem.clear();
    if (this._available) {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(this.ns + ':'))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  }
}

export const persistentCache = new PersistentCache();

export { Cache };

export const cache = new Cache();
