// src/components/EventFeed.jsx
// Live contract event display with real-time polling indicators

import React from 'react';
import { Spinner } from './LoadingStates.jsx';

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const EVENT_TYPE_CONFIG = {
  increment: { color: '#10b981', icon: '↑', label: 'INCREMENT' },
  decrement: { color: '#f59e0b', icon: '↓', label: 'DECREMENT' },
  reset: { color: '#ef4444', icon: '↺', label: 'RESET' },
  register: { color: '#00d4ff', icon: '✚', label: 'REGISTER' },
  connect: { color: '#10b981', icon: '⚡', label: 'CONNECT' },
  disconnect: { color: '#f59e0b', icon: '⊘', label: 'DISCONNECT' },
  subscribe: { color: '#00d4ff', icon: '★', label: 'SUBSCRIBE' },
  default: { color: '#8fa8c8', icon: '●', label: 'EVENT' },
};

function getEventConfig(type) {
  const key = (type || '').toLowerCase();
  return EVENT_TYPE_CONFIG[key] || EVENT_TYPE_CONFIG.default;
}

function EventRow({ event }) {
  const cfg = getEventConfig(event.eventType || event.type);
  return (
    <div style={styles.row}>
      <div style={{ ...styles.dot, background: cfg.color, boxShadow: `0 0 6px ${cfg.color}60` }} />
      <div style={styles.rowContent}>
        <div style={styles.rowTop}>
          <span style={{ ...styles.eventType, color: cfg.color }}>
            {cfg.icon} {cfg.label}
          </span>
          {event.isLocal && (
            <span style={styles.localBadge}>LOCAL</span>
          )}
        </div>
        {event.txHash && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.txLink}
          >
            tx: {event.txHash.slice(0, 8)}…{event.txHash.slice(-8)} ↗
          </a>
        )}
      </div>
      <div style={styles.rowAge}>
        {event.timestamp ? timeAgo(event.timestamp) : '—'}
      </div>
    </div>
  );
}

export function EventFeed({ events, syncing, lastSync, syncError }) {
  return (
    <section aria-label="Contract events" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{
            ...styles.liveDot,
            background: syncing ? '#f59e0b' : '#10b981',
          }} />
          <span style={styles.headerLabel}>CONTRACT EVENTS</span>
          {events.length > 0 && (
            <span style={styles.count}>{events.length}</span>
          )}
        </div>
        <div style={styles.syncInfo}>
          {syncing ? (
            <><Spinner size={10} color="#f59e0b" label="Syncing" />&nbsp;syncing</>
          ) : lastSync ? (
            `updated ${timeAgo(lastSync)}`
          ) : 'listening'}
        </div>
      </div>

      {/* Error state */}
      {syncError && (
        <div style={styles.errorRow}>⚠ Event sync error: {syncError}</div>
      )}

      {/* Events */}
      <div style={styles.list} role="log" aria-live="polite" aria-label="Contract event log">
        {events.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📡</div>
            <div style={styles.emptyText}>Listening for events…</div>
            <div style={styles.emptyHint}>Polls every 12 seconds</div>
          </div>
        ) : (
          events.map((ev, i) => <EventRow key={ev.id || i} event={ev} />)
        )}
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
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
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
    background: 'rgba(16,185,129,0.12)',
    color: '#10b981',
  },
  syncInfo: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    color: 'var(--color-text-muted, #6b8aaa)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  errorRow: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    color: '#f59e0b',
    padding: '6px 14px',
    borderBottom: '1px solid rgba(245,158,11,0.15)',
    background: 'rgba(245,158,11,0.06)',
  },
  list: {
    maxHeight: 240,
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '9px 14px',
    borderBottom: '1px solid var(--color-border, #2a3550)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: 5,
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTop: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 },
  eventType: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  localBadge: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 9,
    padding: '1px 5px',
    borderRadius: 3,
    background: 'rgba(0,212,255,0.12)',
    color: '#00d4ff',
    letterSpacing: '0.1em',
  },
  txLink: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    color: 'var(--color-text-muted, #6b8aaa)',
    textDecoration: 'none',
  },
  rowAge: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 9,
    color: 'var(--color-text-muted, #6b8aaa)',
    flexShrink: 0,
    marginTop: 3,
  },
  empty: {
    padding: '32px 14px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  emptyIcon: { fontSize: 28, opacity: 0.5 },
  emptyText: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 13,
    color: 'var(--color-text-secondary, #8fa8c8)',
  },
  emptyHint: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    color: 'var(--color-text-muted, #6b8aaa)',
  },
};
