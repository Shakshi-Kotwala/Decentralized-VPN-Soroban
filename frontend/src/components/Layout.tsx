import { Outlet, NavLink } from 'react-router-dom'
import { WalletButton } from './WalletButton'
import { Shield, Code2, LayoutDashboard, ExternalLink } from 'lucide-react'
import { CONTRACT_CONFIG } from '../lib/contract.config'

export function Layout() {
  return (
    <div className="flex flex-col h-screen bg-stellar-black overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex-shrink-0 h-12 bg-stellar-panel border-b border-stellar-border flex items-center px-4 gap-4 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-md bg-stellar-accent/20 border border-stellar-accent/40 flex items-center justify-center">
            <Shield size={14} className="text-stellar-accent" />
          </div>
          <span className="font-display font-semibold text-sm text-white tracking-wide">
            dVPN<span className="text-stellar-accent">•</span>Stellar
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                isActive
                  ? 'bg-stellar-border text-white'
                  : 'text-stellar-muted hover:text-stellar-text'
              }`
            }
          >
            <LayoutDashboard size={12} />
            Dashboard
          </NavLink>
          <NavLink
            to="/ide"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                isActive
                  ? 'bg-stellar-border text-white'
                  : 'text-stellar-muted hover:text-stellar-text'
              }`
            }
          >
            <Code2 size={12} />
            Contract IDE
          </NavLink>
        </nav>

        {/* Contract badge */}
        <a
          href={CONTRACT_CONFIG.EXPLORER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-stellar-green/5 border border-stellar-green/20 hover:border-stellar-green/40 transition-colors group"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-stellar-green" />
          <span className="text-xs font-mono text-stellar-green">
            CCASXT…DXTW
          </span>
          <ExternalLink size={9} className="text-stellar-green/60 group-hover:text-stellar-green transition-colors" />
        </a>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Wallet */}
        <WalletButton />
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
