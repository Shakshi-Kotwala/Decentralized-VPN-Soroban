// src/components/ErrorBanner.jsx
// Displays WalletNotFoundError, TransactionRejectedError, InsufficientBalanceError

import React, { useEffect, useState } from 'react';
import { getErrorUIConfig } from '../lib/errors.js';

export function ErrorBanner({ error, onDismiss, autoDismissMs = 0 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (autoDismissMs > 0) {
      const t = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, autoDismissMs);
      return () => clearTimeout(t);
    }
  }, [error, autoDismissMs, onDismiss]);

  if (!error || !visible) return null;

  const errorCode = error.code || error.type || 'DEFAULT';
  const cfg = getErrorUIConfig(errorCode);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        ...styles.banner,
        background: cfg.bgColor,
        borderColor: cfg.borderColor,
        animation: 'slideIn 0.2s ease',
      }}
    >
      {/* Icon + type label */}
      <div style={styles.iconCol}>
        <span style={styles.icon} aria-hidden="true">{cfg.icon}</span>
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={{ ...styles.label, color: cfg.color }}>{cfg.label}</div>
        <div style={styles.message}>
          {error.userMessage || error.message}
        </div>
        {cfg.hint && (
          <div style={styles.hint}>{cfg.hint}</div>
        )}
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          aria-label="Dismiss error"
          style={styles.dismiss}
          onClick={() => { setVisible(false); onDismiss(); }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Inline error for form fields
export function InlineError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" style={styles.inline}>⚠ {message}</p>
  );
}

const styles = {
  banner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid',
    marginBottom: 14,
  },
  iconCol: { flexShrink: 0, paddingTop: 2 },
  icon: { fontSize: 20 },
  content: { flex: 1, minWidth: 0 },
  label: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    letterSpacing: '0.15em',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: 'var(--color-text-primary, #e8f0fe)',
    lineHeight: 1.5,
    marginBottom: 4,
    wordBreak: 'break-word',
  },
  hint: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    color: 'var(--color-text-muted, #6b8aaa)',
    lineHeight: 1.5,
  },
  dismiss: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted, #6b8aaa)',
    fontSize: 16,
    padding: 0,
    flexShrink: 0,
    lineHeight: 1,
  },
  inline: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
};
