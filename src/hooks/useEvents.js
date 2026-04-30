// src/hooks/useEvents.js
// Real-time contract event polling with state synchronization

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchContractEvents } from '../lib/contract.js';
import { cache } from '../lib/cache.js';

const POLL_INTERVAL_MS = 12000; // 12 seconds
const CACHE_KEY = 'contract_events';
const CACHE_TTL = 10000;

export function useEvents(enabled = true) {
  const [events, setEvents] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const timerRef = useRef(null);
  const seenIds = useRef(new Set());

  const poll = useCallback(async () => {
    if (!enabled) return;

    // Use cache to avoid hammering the RPC
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      setEvents(cached);
      return;
    }

    setSyncing(true);
    setSyncError(null);

    try {
      const fetched = await fetchContractEvents();

      if (fetched.length > 0) {
        const newEvents = fetched.filter((e) => !seenIds.current.has(e.id));
        newEvents.forEach((e) => seenIds.current.add(e.id));

        setEvents((prev) => {
          const combined = [...newEvents, ...prev].slice(0, 50);
          cache.set(CACHE_KEY, combined, CACHE_TTL);
          return combined;
        });
      }
      setLastSync(new Date());
    } catch (err) {
      console.warn('[useEvents] poll error:', err.message);
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  }, [enabled]);

  // Inject a local synthetic event when a tx succeeds
  // (bridges the gap between tx confirmation and next poll)
  const injectLocalEvent = useCallback((type, txHash, callerAddress) => {
    const synthetic = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      isLocal: true,
      eventType: type,
      txHash,
      callerAddress,
      timestamp: new Date().toISOString(),
    };
    setEvents((prev) => [synthetic, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    poll(); // Initial fetch
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [poll, enabled]);

  return {
    events,
    syncing,
    lastSync,
    syncError,
    injectLocalEvent,
    forcePoll: poll,
  };
}
