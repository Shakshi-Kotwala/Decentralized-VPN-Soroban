// src/lib/errors.js
// Custom error classes for the 3 required error types

// ─────────────────────────────────────────────────────────
// ERROR TYPE 1: Wallet Not Found / Not Installed
// ─────────────────────────────────────────────────────────
export class WalletNotFoundError extends Error {
  constructor(walletId = 'unknown') {
    super(
      `Wallet "${walletId}" is not installed or not available. ` +
      `Please install the wallet extension and refresh the page.`
    );
    this.name = 'WalletNotFoundError';
    this.code = 'WALLET_NOT_FOUND';
    this.walletId = walletId;
    this.userMessage = 'Wallet not found. Install the extension and try again.';
    this.actionLabel = 'Install Wallet';
  }
}

// ─────────────────────────────────────────────────────────
// ERROR TYPE 2: Transaction Rejected by User
// ─────────────────────────────────────────────────────────
export class TransactionRejectedError extends Error {
  constructor(detail = '') {
    super(
      `Transaction was rejected.${detail ? ' ' + detail : ''} ` +
      `The user cancelled or denied the signing request in their wallet.`
    );
    this.name = 'TransactionRejectedError';
    this.code = 'TRANSACTION_REJECTED';
    this.userMessage = 'You rejected the transaction in your wallet.';
    this.actionLabel = 'Try Again';
  }
}

// ─────────────────────────────────────────────────────────
// ERROR TYPE 3: Insufficient Balance
// ─────────────────────────────────────────────────────────
export class InsufficientBalanceError extends Error {
  constructor(required = 0, available = 0, asset = 'XLM') {
    super(
      `Insufficient ${asset} balance. ` +
      `Required: ${required} ${asset}, Available: ${available} ${asset}.`
    );
    this.name = 'InsufficientBalanceError';
    this.code = 'INSUFFICIENT_BALANCE';
    this.required = required;
    this.available = available;
    this.asset = asset;
    this.userMessage = `Not enough ${asset}. Fund your testnet account using Friendbot.`;
    this.actionLabel = 'Get Testnet Funds';
  }
}

// ─────────────────────────────────────────────────────────
// Error classifier — maps raw wallet/SDK errors to our types
// ─────────────────────────────────────────────────────────
export function classifyError(err, walletId = null) {
  if (!err) return new Error('Unknown error');

  // Already our custom type
  if (
    err instanceof WalletNotFoundError ||
    err instanceof TransactionRejectedError ||
    err instanceof InsufficientBalanceError
  ) {
    return err;
  }

  const msg = (err.message || '').toLowerCase();
  const code = err.code ?? null;

  // Wallet not found patterns
  if (
    msg.includes('not installed') ||
    msg.includes('not found') ||
    msg.includes('extension') ||
    msg.includes('no wallet') ||
    msg.includes('undefined') ||
    code === -32700 ||
    code === 4100
  ) {
    return new WalletNotFoundError(walletId);
  }

  // Transaction rejected patterns
  if (
    msg.includes('reject') ||
    msg.includes('denied') ||
    msg.includes('cancel') ||
    msg.includes('user refused') ||
    msg.includes('declined') ||
    code === 4001
  ) {
    return new TransactionRejectedError();
  }

  // Insufficient balance patterns
  if (
    msg.includes('insufficient') ||
    msg.includes('balance') ||
    msg.includes('underfunded') ||
    msg.includes('op_underfunded')
  ) {
    return new InsufficientBalanceError();
  }

  return err;
}

// ─────────────────────────────────────────────────────────
// Error metadata for UI rendering
// ─────────────────────────────────────────────────────────
export const ERROR_UI_CONFIG = {
  WALLET_NOT_FOUND: {
    icon: '🔌',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.3)',
    label: 'WALLET NOT FOUND',
    hint: 'Install the wallet browser extension and reload the page.',
  },
  TRANSACTION_REJECTED: {
    icon: '🚫',
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)',
    label: 'TRANSACTION REJECTED',
    hint: 'You cancelled the transaction. Click the button again when ready.',
  },
  INSUFFICIENT_BALANCE: {
    icon: '💸',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.3)',
    label: 'INSUFFICIENT BALANCE',
    hint: 'Use the Friendbot button to get free testnet XLM.',
  },
  DEFAULT: {
    icon: '⚠️',
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)',
    label: 'ERROR',
    hint: 'An unexpected error occurred. Check the console for details.',
  },
};

export function getErrorUIConfig(errorCode) {
  return ERROR_UI_CONFIG[errorCode] || ERROR_UI_CONFIG.DEFAULT;
}
