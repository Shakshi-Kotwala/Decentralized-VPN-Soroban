// src/components/LoadingStates.jsx
// Reusable loading indicators: spinner, skeleton, progress bar, overlay

import React from 'react';

// ── Spinner ─────────────────────────────────────────────
export function Spinner({ size = 20, color = 'var(--color-accent, #00d4ff)', label = 'Loading…' }) {
  return (
    <span role="status" aria-label={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// ── Skeleton block ──────────────────────────────────────
export function Skeleton({ width = '100%', height = 16, borderRadius = 4, style = {} }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #1e2535 25%, #263045 50%, #1e2535 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

// ── Progress bar ────────────────────────────────────────
export function ProgressBar({ progress = 0, color = '#00d4ff', label = 'Progress' }) {
  return (
    <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div style={styles.progressTrack}>
        <div style={{
          ...styles.progressFill,
          width: `${Math.min(100, Math.max(0, progress))}%`,
          background: color,
          boxShadow: `0 0 8px ${color}80`,
        }} />
      </div>
      <div style={styles.progressLabel}>{progress}%</div>
    </div>
  );
}

// ── Full-screen loading overlay ─────────────────────────
export function LoadingOverlay({ message = 'Loading…', subtext = '' }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={message}
      style={styles.overlay}
    >
      <div style={styles.overlayCard}>
        <Spinner size={40} />
        <p style={styles.overlayMessage}>{message}</p>
        {subtext && <p style={styles.overlaySubtext}>{subtext}</p>}
      </div>
    </div>
  );
}

// ── Tx-specific loading state ───────────────────────────
export function TxLoadingBanner({ method }) {
  return (
    <div style={styles.txBanner} role="status" aria-live="polite">
      <Spinner size={16} label={`Submitting ${method}`} />
      <div>
        <div style={styles.txMethod}>{method}()</div>
        <div style={styles.txSub}>Waiting for wallet confirmation…</div>
      </div>
    </div>
  );
}

// ── Balance skeleton ────────────────────────────────────
export function BalanceSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Skeleton width={120} height={36} borderRadius={6} />
      <Skeleton width={200} height={12} borderRadius={4} />
    </div>
  );
}

const styles = {
  progressTrack: {
    height: 4,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    color: 'var(--color-text-muted, #6b8aaa)',
    marginTop: 4,
    textAlign: 'right',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  overlayCard: {
    background: 'var(--color-surface, #1a1f2e)',
    border: '1px solid var(--color-border, #2a3550)',
    borderRadius: 16,
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    maxWidth: 320,
    textAlign: 'center',
  },
  overlayMessage: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--color-text-primary, #e8f0fe)',
  },
  overlaySubtext: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 12,
    color: 'var(--color-text-muted, #6b8aaa)',
    lineHeight: 1.6,
  },
  txBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: 8,
  },
  txMethod: {
    fontFamily: 'var(--font-mono, monospace)',
    fontWeight: 700,
    fontSize: 13,
    color: '#f59e0b',
  },
  txSub: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    color: 'var(--color-text-muted, #6b8aaa)',
  },
};
