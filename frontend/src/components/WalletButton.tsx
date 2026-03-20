import { useWallet } from '../hooks/useWallet'
import { Wallet, LogOut, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { CONTRACT_CONFIG } from '../lib/contract.config'

export function WalletButton() {
  const { isConnected, publicKey, network, isLoading, error, connect, disconnect } = useWallet()

  const truncate = (key: string) => `${key.slice(0, 6)}…${key.slice(-4)}`

  if (isConnected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stellar-panel border border-stellar-border rounded-lg">
          <span className="network-dot" />
          <span className="text-xs font-mono text-stellar-muted">
            {network || 'TESTNET'}
          </span>
        </div>
        <a
          href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 bg-stellar-panel border border-stellar-border rounded-lg hover:border-stellar-accent/50 transition-colors group"
          title="View on Stellar Expert"
        >
          <Wallet size={13} className="text-stellar-green" />
          <span className="text-xs font-mono text-stellar-text">{truncate(publicKey)}</span>
          <ExternalLink size={10} className="text-stellar-muted group-hover:text-stellar-accent transition-colors" />
        </a>
        <button
          onClick={disconnect}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stellar-panel border border-stellar-border rounded-lg text-stellar-muted hover:text-stellar-red hover:border-stellar-red/40 transition-all text-xs font-mono"
          title="Disconnect wallet"
        >
          <LogOut size={12} />
          <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <div className="flex items-center gap-1 text-xs text-stellar-red font-mono">
          <AlertCircle size={12} />
          <span className="hidden md:inline max-w-[200px] truncate">{error}</span>
        </div>
      )}
      <button
        onClick={connect}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-1.5 bg-stellar-accent hover:bg-stellar-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-mono text-sm transition-all duration-200 shadow-lg shadow-stellar-accent/20"
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Wallet size={14} />
        )}
        <span>{isLoading ? 'Connecting…' : 'Connect Freighter'}</span>
      </button>
    </div>
  )
}
