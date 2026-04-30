// src/hooks/useTxTracker.js
// Transaction lifecycle: pending → success | failed

import { useState, useCallback, useRef } from 'react';
import { classifyError } from '../lib/errors.js';
import { txExplorerUrl } from '../lib/contract.js';

export const TX_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

let _txCounter = 0;

export function useTxTracker() {
  const [transactions, setTransactions] = useState([]);
  const [activeTx, setActiveTx] = useState(null);

  const addTx = useCallback((method) => {
    const id = ++_txCounter;
    const tx = {
      id,
      method,
      status: TX_STATUS.PENDING,
      hash: null,
      explorerUrl: null,
      error: null,
      createdAt: Date.now(),
    };
    setTransactions((prev) => [tx, ...prev].slice(0, 30));
    setActiveTx(tx);
    return id;
  }, []);

  const updateTx = useCallback((id, updates) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
    setActiveTx((prev) => (prev?.id === id ? { ...prev, ...updates } : prev));
  }, []);

  const resolveTx = useCallback((id, hash) => {
    const updates = {
      status: TX_STATUS.SUCCESS,
      hash,
      explorerUrl: txExplorerUrl(hash),
    };
    updateTx(id, updates);
    setActiveTx(null);
  }, [updateTx]);

  const failTx = useCallback((id, err) => {
    const classified = classifyError(err);
    const updates = {
      status: TX_STATUS.FAILED,
      error: {
        type: classified.code || 'UNKNOWN',
        message: classified.userMessage || classified.message,
      },
    };
    updateTx(id, updates);
    setActiveTx(null);
  }, [updateTx]);

  // Wrap any async contract call with full tracking
  const trackCall = useCallback(async (method, fn) => {
    const id = addTx(method);
    try {
      const result = await fn();
      resolveTx(id, result.hash);
      return result;
    } catch (err) {
      failTx(id, err);
      throw err; // Re-throw so UI can also react
    }
  }, [addTx, resolveTx, failTx]);

  const clearHistory = useCallback(() => {
    setTransactions([]);
  }, []);

  return {
    transactions,
    activeTx,
    trackCall,
    clearHistory,
  };
}
