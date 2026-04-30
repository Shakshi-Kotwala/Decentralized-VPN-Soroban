// src/hooks/useWallet.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { connectWallet, getAccountBalance, requestFriendbot } from '../lib/walletKit.js';
import { classifyError } from '../lib/errors.js';
import { persistentCache } from '../lib/cache.js';

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [walletId, setWalletId] = useState(null);
  const [balance, setBalance] = useState('0.0000');
  const [connecting, setConnecting] = useState(false);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState(null); // { type, message, userMessage, actionLabel }
  const refreshTimer = useRef(null);

  const clearError = useCallback(() => setError(null), []);

  const setClassifiedError = useCallback((err) => {
    const classified = classifyError(err);
    setError({
      type: classified.code || 'UNKNOWN',
      name: classified.name,
      message: classified.message,
      userMessage: classified.userMessage || classified.message,
      actionLabel: classified.actionLabel,
    });
  }, []);

  // ── Connect ──────────────────────────────────────────
  const connect = useCallback(async (selectedWalletId) => {
    setConnecting(true);
    setError(null);
    try {
      const { address: addr } = await connectWallet(selectedWalletId);
      setAddress(addr);
      setWalletId(selectedWalletId);

      // Load balance (with cache)
      const cached = persistentCache.get(`balance:${addr}`);
      if (cached) setBalance(cached);
      const live = await getAccountBalance(addr);
      setBalance(live);
      persistentCache.set(`balance:${addr}`, live, 15000);
    } catch (err) {
      setClassifiedError(err);
    } finally {
      setConnecting(false);
    }
  }, [setClassifiedError]);

  // ── Disconnect ───────────────────────────────────────
  const disconnect = useCallback(() => {
    clearTimeout(refreshTimer.current);
    setAddress(null);
    setWalletId(null);
    setBalance('0.0000');
    setError(null);
  }, []);

  // ── Refresh balance ──────────────────────────────────
  const refreshBalance = useCallback(async () => {
    if (!address) return;
    const bal = await getAccountBalance(address);
    setBalance(bal);
    persistentCache.set(`balance:${address}`, bal, 15000);
    return bal;
  }, [address]);

  // ── Fund via Friendbot ───────────────────────────────
  const fundAccount = useCallback(async () => {
    if (!address) return;
    setFunding(true);
    setError(null);
    try {
      await requestFriendbot(address);
      await refreshBalance();
    } catch (err) {
      setClassifiedError(err);
    } finally {
      setFunding(false);
    }
  }, [address, refreshBalance, setClassifiedError]);

  // ── Auto-refresh balance every 20s ──────────────────
  useEffect(() => {
    if (!address) return;
    refreshTimer.current = setInterval(refreshBalance, 20000);
    return () => clearInterval(refreshTimer.current);
  }, [address, refreshBalance]);

  return {
    address,
    walletId,
    balance,
    connecting,
    funding,
    error,
    isConnected: !!address,
    connect,
    disconnect,
    refreshBalance,
    fundAccount,
    clearError,
  };
}
