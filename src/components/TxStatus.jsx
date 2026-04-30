// src/components/TxStatus.jsx
// Transaction status tracker — shows pending / success / failed with explorer links

import React from 'react';
import { TX_STATUS } from '../hooks/useTxTracker.js';

const STATUS_STYLES = {
  [TX_STATUS.PENDING]: {
    dot: '#f59e0b',
    label: 'PENDING',
    labelColor: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    icon: '⟳',
    spin: true,
  },
  [TX_STATUS.SUCCESS]: {
    dot: '#10b981',
    label: 'CONFIRMED',
    labelColor: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
    icon: '✓',
    spin: false,
  },
  [TX_STATUS.FAILED]: {
    dot: '#ef4444',
    label: 'FAILED',
    labelColor: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    icon: '✕',
    spin: false,
  },
};

function TxRow({ tx }) {
  const cfg = STATUS_STYLES[tx.status] || STATUS_STYLES[TX_STATUS.FAILED];
  const age = Math.floor((Date.now() - tx.createdAt) / 1000);
  const ageLabel = age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`;

  return (
    <div style={{ ...styles.row, background: cfg.bg, borderColor: cfg.border }}>
      {/* Status icon */}
      <div style={{
        ...styles.icon,
        color: cfg.dot,
        animation: cfg.spin ? 'spin 1s linear infinite' : 'none',
      }}>
        {cfg.icon}
      </div>

      {/* Info */}
      <div style={styles.info}>
        <div style={styles.methodRow}>
          <span style={styles.method}>{tx.method}()</span>
          <span style={{ ...styles.statusBadge, color: cfg.labelColor, borderColor: cfg.border }}>
            {cfg.label}
          </span>
        </div>

        {tx.status === TX_STATUS.PENDING && (
          <div style={styles.subtext}>Awaiting wallet confirmation…</div>
        )}
        {tx.status === TX_STATUS.SUCCESS && tx.hash && (
          <a
            href={tx.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.hashLink}
          >
            {tx.hash.slice(0, 10)}…{tx.hash.slice(-10)} ↗
          </a>
        )}
        {tx.status === TX_STATUS.FAILED && tx.error && (
          <div style={{ ...styles.subtext, color: '#ef4444' }}>
            {tx.error.message}
          </div>
        )}
      </div>

      {/* Age */}
      <div style={styles.age}>{ageLabel}</div>
    </div>
  );
}

export function TxStatus({ transactions, activeTx, onClear }) {
  if (transactions.length === 0) return null;

  return (
    <section aria-label="Transaction history" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{
            ...styles.liveDot,
            background: activeTx ? '#f59e0b' : '#10b981',
            animation: activeTx ? 'pulse 1s infinite' : 'pulse 3s infinite',
          }} />
          <span style={styles.headerLabel}>TRANSACTIONS</span>
          <span style={styles.count}>{transactions.length}</span>
        </div>
        <button onClick={onClear} style={styles.clearBtn} aria-label="Clear transaction history">
          CLEAR
        </button>
      </div>

      {/* Active tx banner */}
      {activeTx && (
        <div style={styles.activeBanner}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
          &nbsp; Submitting <strong>{activeTx.method}()</strong> to Stellar Testnet…
        </div>
      )}

      {/* Tx list */}
      <div style={styles.list}>
        {transactions.map((tx) => (
          <TxRow key={tx.id} tx={tx} />
        ))}
      </div>
    </section>
  );
}

const styles = {
  container: {
    border: '1px solid var(--color-border, #2a3550)',
    borderRadius: 12,
    overflow: 'hidden',
    background: 'var(--color-surface, #1a1f2e)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid var(--color-border, #2a3550)',
    background: 'var(--color-surface-raised, #1e2535)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    transition: 'background 0.3s',
  },
  headerLabel: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    letterSpacing: '0.15em',
    color: 'var(--color-text-secondary, #8fa8c8)',
  },
  count: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 3,
    background: 'rgba(0,212,255,0.12)',
    color: '#00d4ff',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 9,
    letterSpacing: '0.1em',
    color: 'var(--color-text-muted, #6b8aaa)',
    padding: '2px 6px',
  },
  activeBanner: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 12,
    color: '#f59e0b',
    background: 'rgba(245,158,11,0.08)',
    padding: '8px 14px',
    borderBottom: '1px solid rgba(245,158,11,0.15)',
  },
  list: {
    maxHeight: 300,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 14px',
    border: '1px solid transparent',
    borderLeftWidth: 3,
    transition: 'background 0.2s',
  },
  icon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  info: { flex: 1, minWidth: 0 },
  methodRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  method: {
    fontFamily: 'var(--font-mono, monospace)',
    fontWeight: 700,
    fontSize: 13,
    color: 'var(--color-text-primary, #e8f0fe)',
  },
  statusBadge: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 9,
    letterSpacing: '0.1em',
    padding: '1px 5px',
    borderRadius: 3,
    border: '1px solid',
  },
  subtext: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    color: 'var(--color-text-muted, #6b8aaa)',
  },
  hashLink: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    color: '#00d4ff',
    textDecoration: 'none',
  },
  age: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    color: 'var(--color-text-muted, #6b8aaa)',
    flexShrink: 0,
    marginTop: 2,
  },
};
