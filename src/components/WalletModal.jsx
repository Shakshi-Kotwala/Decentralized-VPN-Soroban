// src/components/WalletModal.jsx
import React, { useEffect } from 'react';
import { AVAILABLE_WALLETS } from '../lib/walletKit.js';

export function WalletModal({ onSelect, onClose, connecting, selectedWalletId }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      style={styles.overlay}
      onClick={onClose}
    >
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>STELLAR TESTNET</p>
            <h2 id="wallet-modal-title" style={styles.title}>Connect Your Wallet</h2>
            <p style={styles.subtitle}>
              Choose a wallet to interact with the decentralized VPN contract.
            </p>
          </div>
          <button
            aria-label="Close wallet modal"
            style={styles.closeBtn}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Wallet list */}
        <ul style={styles.list} role="list">
          {AVAILABLE_WALLETS.map((wallet) => {
            const isLoading = connecting && selectedWalletId === wallet.id;
            return (
              <li key={wallet.id} style={styles.listItem}>
                <button
                  onClick={() => !connecting && onSelect(wallet.id)}
                  disabled={connecting}
                  aria-busy={isLoading}
                  style={{
                    ...styles.walletBtn,
                    opacity: connecting && !isLoading ? 0.5 : 1,
                    borderColor: isLoading ? wallet.accentColor : undefined,
                    background: isLoading
                      ? `${wallet.accentColor}18`
                      : 'var(--color-surface-raised)',
                  }}
                >
                  <span
                    style={{
                      ...styles.walletIconWrap,
                      background: `${wallet.accentColor}20`,
                      border: `1px solid ${wallet.accentColor}40`,
                    }}
                    aria-hidden="true"
                  >
                    {isLoading ? (
                      <span style={styles.spinner} />
                    ) : (
                      <span style={{ fontSize: 24 }}>{wallet.icon}</span>
                    )}
                  </span>

                  <div style={styles.walletInfo}>
                    <span style={styles.walletName}>{wallet.name}</span>
                    <span style={styles.walletDesc}>{wallet.description}</span>
                  </div>

                  {isLoading ? (
                    <span style={{ ...styles.badge, color: wallet.accentColor }}>
                      Connecting…
                    </span>
                  ) : (
                    <span style={styles.arrow} aria-hidden="true">→</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <p style={styles.footer}>
          Don't have a wallet?&nbsp;
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            Get Freighter →
          </a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9000,
    padding: 16,
    animation: 'fadeIn 0.15s ease',
  },
  panel: {
    width: '100%',
    maxWidth: 480,
    background: 'var(--color-surface, #1a1f2e)',
    border: '1px solid var(--color-border, #2a3550)',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    animation: 'slideUp 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 24px 16px',
    borderBottom: '1px solid var(--color-border, #2a3550)',
  },
  eyebrow: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    letterSpacing: '0.15em',
    color: 'var(--color-accent, #00d4ff)',
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--color-text-primary, #e8f0fe)',
    marginBottom: 6,
    lineHeight: 1.2,
  },
  subtitle: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 12,
    color: 'var(--color-text-muted, #6b8aaa)',
    lineHeight: 1.6,
    maxWidth: 300,
  },
  closeBtn: {
    background: 'none',
    border: '1px solid var(--color-border, #2a3550)',
    borderRadius: 6,
    color: 'var(--color-text-muted, #6b8aaa)',
    cursor: 'pointer',
    fontSize: 14,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 12,
  },
  list: {
    listStyle: 'none',
    padding: '12px 16px',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  listItem: { margin: 0 },
  walletBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid var(--color-border, #2a3550)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    fontFamily: 'inherit',
    color: 'var(--color-text-primary, #e8f0fe)',
  },
  walletIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  spinner: {
    display: 'inline-block',
    width: 18,
    height: 18,
    border: '2px solid rgba(255,255,255,0.2)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  walletInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  walletName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-primary, #e8f0fe)',
  },
  walletDesc: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    color: 'var(--color-text-muted, #6b8aaa)',
  },
  badge: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    letterSpacing: '0.1em',
    flexShrink: 0,
  },
  arrow: {
    fontSize: 16,
    color: 'var(--color-text-muted, #6b8aaa)',
    flexShrink: 0,
  },
  footer: {
    padding: '12px 24px 20px',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 12,
    color: 'var(--color-text-muted, #6b8aaa)',
    textAlign: 'center',
  },
  link: {
    color: 'var(--color-accent, #00d4ff)',
    textDecoration: 'none',
  },
};
