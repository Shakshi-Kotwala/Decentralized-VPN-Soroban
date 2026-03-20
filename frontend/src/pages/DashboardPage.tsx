import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../hooks/useWallet'
import {
  buildSubscribeTx,
  buildRegisterNodeTx,
  isSubscribed,
  getNode,
  getXlmBalance,
  submitSignedXdr,
} from '../lib/vpnContract'
import {
  Shield, ShieldCheck, Server, Globe, Loader2,
  Wifi, WifiOff, AlertCircle, CheckCircle2, ExternalLink, RefreshCw,
  Lock, Unlock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { CONTRACT_CONFIG } from '../lib/contract.config'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────
type TxStep = 'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error'

interface UserState {
  subscribed: boolean | null
  nodeEndpoint: string | null
  balance: string
  loading: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { isConnected, publicKey, signTransaction } = useWallet()
  const [userState, setUserState] = useState<UserState>({
    subscribed: null,
    nodeEndpoint: null,
    balance: '—',
    loading: false,
  })
  const [subscribeTx, setSubscribeTx] = useState<TxStep>('idle')
  const [registerTx, setRegisterTx] = useState<TxStep>('idle')
  const [endpoint, setEndpoint] = useState('')
  const [checkAddress, setCheckAddress] = useState('')
  const [checkResult, setCheckResult] = useState<{ subscribed: boolean; node: string | null } | null>(null)
  const [checking, setChecking] = useState(false)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  // ─── Load user state ────────────────────────────────────────────────────────
  const loadUserState = useCallback(async () => {
    if (!publicKey) return
    setUserState((s) => ({ ...s, loading: true }))
    try {
      const [subbed, node, balance] = await Promise.all([
        isSubscribed(publicKey).catch(() => false),
        getNode(publicKey).catch(() => null),
        getXlmBalance(publicKey),
      ])
      setUserState({ subscribed: subbed, nodeEndpoint: node, balance, loading: false })
    } catch {
      setUserState((s) => ({ ...s, loading: false }))
    }
  }, [publicKey])

  useEffect(() => {
    if (isConnected && publicKey) loadUserState()
  }, [isConnected, publicKey, loadUserState])

  // ─── Subscribe handler ──────────────────────────────────────────────────────
  const handleSubscribe = async () => {
    if (!publicKey) return
    setSubscribeTx('building')
    try {
      const xdr = await buildSubscribeTx(publicKey)
      setSubscribeTx('signing')
      const signed = await signTransaction(xdr)
      setSubscribeTx('submitting')
      const hash = await submitSignedXdr(signed)
      setLastTxHash(hash)
      setSubscribeTx('success')
      toast.success('Subscribed to dVPN network!')
      await loadUserState()
      setTimeout(() => setSubscribeTx('idle'), 4000)
    } catch (err: any) {
      setSubscribeTx('error')
      toast.error(err.message || 'Transaction failed')
      setTimeout(() => setSubscribeTx('idle'), 4000)
    }
  }

  // ─── Register node handler ───────────────────────────────────────────────────
  const handleRegisterNode = async () => {
    if (!publicKey || !endpoint.trim()) return
    setRegisterTx('building')
    try {
      const xdr = await buildRegisterNodeTx(publicKey, endpoint.trim())
      setRegisterTx('signing')
      const signed = await signTransaction(xdr)
      setRegisterTx('submitting')
      const hash = await submitSignedXdr(signed)
      setLastTxHash(hash)
      setRegisterTx('success')
      toast.success(`Node "${endpoint.trim()}" registered!`)
      setEndpoint('')
      await loadUserState()
      setTimeout(() => setRegisterTx('idle'), 4000)
    } catch (err: any) {
      setRegisterTx('error')
      toast.error(err.message || 'Transaction failed')
      setTimeout(() => setRegisterTx('idle'), 4000)
    }
  }

  // ─── Check any address ───────────────────────────────────────────────────────
  const handleCheck = async () => {
    if (!checkAddress.trim() || !publicKey) return
    setChecking(true)
    setCheckResult(null)
    try {
      const [subbed, node] = await Promise.all([
        isSubscribed(checkAddress.trim(), publicKey).catch(() => false),
        getNode(checkAddress.trim(), publicKey).catch(() => null),
      ])
      setCheckResult({ subscribed: subbed as boolean, node })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setChecking(false)
    }
  }

  // ─── Tx step label ─────────────────────────────────────────────────────────
  const stepLabel = (step: TxStep) => {
    if (step === 'building') return 'Building transaction…'
    if (step === 'signing') return 'Waiting for Freighter…'
    if (step === 'submitting') return 'Submitting to Stellar…'
    if (step === 'success') return 'Success!'
    if (step === 'error') return 'Failed'
    return null
  }

  // ─── Not connected state ────────────────────────────────────────────────────
  if (!isConnected || !publicKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-full bg-stellar-accent/10 border border-stellar-accent/20 flex items-center justify-center"
        >
          <Shield size={40} className="text-stellar-accent" />
        </motion.div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            Decentralized VPN
          </h1>
          <p className="text-stellar-muted font-mono text-sm max-w-md">
            Connect your Freighter wallet to subscribe to the VPN network,
            register a node, and manage your on-chain VPN identity.
          </p>
        </motion.div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-3 items-center"
        >
          <p className="text-xs font-mono text-stellar-muted">Contract on Testnet</p>
          <a
            href={CONTRACT_CONFIG.EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-mono text-stellar-accent hover:text-stellar-accent-light transition-colors"
          >
            CCASXTFSH64EVAK4UWUW6SN2MUYZZWKCNK2W3I3RFH7NZ6QO3YFJDXTW
            <ExternalLink size={10} />
          </a>
        </motion.div>
      </div>
    )
  }

  const busy = (s: TxStep) => ['building', 'signing', 'submitting'].includes(s)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-white">dVPN Dashboard</h1>
            <p className="text-xs text-stellar-muted font-mono mt-0.5">
              Stellar Testnet · {CONTRACT_ID_SHORT}
            </p>
          </div>
          <button
            onClick={loadUserState}
            disabled={userState.loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stellar-border text-stellar-muted hover:text-stellar-text text-xs font-mono transition-colors"
          >
            <RefreshCw size={12} className={userState.loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Shield size={16} />}
            label="Subscription"
            value={
              userState.loading ? '…' :
              userState.subscribed === null ? '—' :
              userState.subscribed ? 'Active' : 'Inactive'
            }
            accent={userState.subscribed ? 'green' : 'muted'}
          />
          <StatCard
            icon={<Server size={16} />}
            label="My Node"
            value={userState.loading ? '…' : (userState.nodeEndpoint || 'Not registered')}
            accent={userState.nodeEndpoint ? 'teal' : 'muted'}
          />
          <StatCard
            icon={<Globe size={16} />}
            label="Network"
            value="Stellar Testnet"
            accent="accent"
          />
          <StatCard
            icon={<Wifi size={16} />}
            label="XLM Balance"
            value={userState.loading ? '…' : `${userState.balance} XLM`}
            accent="yellow"
          />
        </div>

        {/* ── Last Tx ── */}
        <AnimatePresence>
          {lastTxHash && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-2 bg-stellar-green/5 border border-stellar-green/20 rounded-lg"
            >
              <CheckCircle2 size={14} className="text-stellar-green flex-shrink-0" />
              <span className="text-xs font-mono text-stellar-text">Last tx:</span>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-stellar-green hover:underline flex items-center gap-1"
              >
                {lastTxHash.slice(0, 20)}…
                <ExternalLink size={10} />
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action Panels ── */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Subscribe Panel */}
          <ActionPanel
            icon={userState.subscribed ? <ShieldCheck size={18} className="text-stellar-green" /> : <Lock size={18} className="text-stellar-muted" />}
            title="Subscribe to dVPN"
            description="Register your wallet address as a subscribed user on-chain. Enables VPN node access through the smart contract."
          >
            {userState.subscribed ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-stellar-green/10 border border-stellar-green/20 rounded-lg">
                <CheckCircle2 size={14} className="text-stellar-green" />
                <span className="text-sm font-mono text-stellar-green">Already subscribed</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-stellar-black/50 rounded border border-stellar-border">
                  <p className="text-xs font-mono text-stellar-muted">Subscribing as:</p>
                  <p className="text-xs font-mono text-stellar-text mt-1 break-all">{publicKey}</p>
                </div>
                <TxButton
                  step={subscribeTx}
                  onClick={handleSubscribe}
                  label="Subscribe Now"
                  icon={<Shield size={14} />}
                />
              </div>
            )}
            {stepLabel(subscribeTx) && (
              <TxStatusBar step={subscribeTx} />
            )}
          </ActionPanel>

          {/* Register Node Panel */}
          <ActionPanel
            icon={<Server size={18} className="text-stellar-teal" />}
            title="Register VPN Node"
            description="Register as a VPN node provider by submitting your endpoint. Others can discover and connect to your node."
          >
            {userState.nodeEndpoint && (
              <div className="flex items-center gap-2 px-3 py-2 bg-stellar-teal/5 border border-stellar-teal/20 rounded mb-3">
                <Globe size={12} className="text-stellar-teal" />
                <span className="text-xs font-mono text-stellar-teal">Current: {userState.nodeEndpoint}</span>
              </div>
            )}
            <div className="space-y-3">
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="e.g. vpn.mynode.io or node1"
                className="w-full px-3 py-2 bg-stellar-black border border-stellar-border rounded font-mono text-sm text-stellar-text placeholder:text-stellar-muted/50 focus:outline-none focus:border-stellar-teal/50 transition-colors"
                maxLength={32}
              />
              <TxButton
                step={registerTx}
                onClick={handleRegisterNode}
                disabled={!endpoint.trim()}
                label={userState.nodeEndpoint ? 'Update Node' : 'Register Node'}
                icon={<Server size={14} />}
                color="teal"
              />
            </div>
            {stepLabel(registerTx) && <TxStatusBar step={registerTx} />}
          </ActionPanel>
        </div>

        {/* ── Query Any Address ── */}
        <div className="panel p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Unlock size={16} className="text-stellar-accent" />
            <h2 className="font-display font-semibold text-sm text-white">Query Any Address</h2>
            <span className="text-xs font-mono text-stellar-muted">· Read-only, no gas needed</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={checkAddress}
              onChange={(e) => setCheckAddress(e.target.value)}
              placeholder="Stellar public key (G…)"
              className="flex-1 px-3 py-2 bg-stellar-black border border-stellar-border rounded font-mono text-sm text-stellar-text placeholder:text-stellar-muted/50 focus:outline-none focus:border-stellar-accent/50 transition-colors"
            />
            <button
              onClick={handleCheck}
              disabled={checking || !checkAddress.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-stellar-accent hover:bg-stellar-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-mono text-sm transition-all"
            >
              {checking ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              Check
            </button>
          </div>
          <AnimatePresence>
            {checkResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="p-3 bg-stellar-black/50 border border-stellar-border rounded">
                  <p className="text-xs font-mono text-stellar-muted mb-1">Subscription</p>
                  <div className={`flex items-center gap-2 text-sm font-mono ${checkResult.subscribed ? 'text-stellar-green' : 'text-stellar-red'}`}>
                    {checkResult.subscribed
                      ? <><CheckCircle2 size={14} /> Active</>
                      : <><AlertCircle size={14} /> Not subscribed</>}
                  </div>
                </div>
                <div className="p-3 bg-stellar-black/50 border border-stellar-border rounded">
                  <p className="text-xs font-mono text-stellar-muted mb-1">Node Endpoint</p>
                  <p className="text-sm font-mono text-stellar-teal">
                    {checkResult.node || <span className="text-stellar-muted">None registered</span>}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Contract Info ── */}
        <div className="panel p-4">
          <h3 className="text-xs font-mono text-stellar-muted mb-3 uppercase tracking-widest">Contract Info</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <InfoRow label="Contract ID" value="CCASXT…DXTW" />
            <InfoRow label="Network" value="Testnet" />
            <InfoRow label="Language" value="Rust / Soroban" />
            <InfoRow label="Functions" value="4 (subscribe, is_subscribed, register_node, get_node)" />
          </div>
          <div className="mt-3 pt-3 border-t border-stellar-border">
            <a
              href={CONTRACT_CONFIG.EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono text-stellar-accent hover:text-stellar-accent-light transition-colors"
            >
              View full contract on Stellar Expert
              <ExternalLink size={10} />
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const CONTRACT_ID_SHORT = 'CCASXTFSH64EVAK4…DXTW'

function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string
  accent: 'green' | 'teal' | 'accent' | 'yellow' | 'muted'
}) {
  const colors = {
    green: 'text-stellar-green',
    teal: 'text-stellar-teal',
    accent: 'text-stellar-accent',
    yellow: 'text-stellar-yellow',
    muted: 'text-stellar-muted',
  }
  return (
    <div className="panel p-3 space-y-1.5">
      <div className={`${colors[accent]} opacity-70`}>{icon}</div>
      <p className="text-xs font-mono text-stellar-muted">{label}</p>
      <p className={`text-sm font-mono font-semibold ${colors[accent]} truncate`}>{value}</p>
    </div>
  )
}

function ActionPanel({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description: string; children: React.ReactNode
}) {
  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h2 className="font-display font-semibold text-sm text-white">{title}</h2>
          <p className="text-xs text-stellar-muted font-mono mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function TxButton({ step, onClick, label, icon, disabled, color = 'accent' }: {
  step: TxStep; onClick: () => void; label: string; icon: React.ReactNode
  disabled?: boolean; color?: 'accent' | 'teal'
}) {
  const busy = ['building', 'signing', 'submitting'].includes(step)
  const bgClass = color === 'teal'
    ? 'bg-stellar-teal/20 hover:bg-stellar-teal/30 text-stellar-teal border-stellar-teal/30'
    : 'bg-stellar-accent hover:bg-stellar-accent-light text-white'

  return (
    <button
      onClick={onClick}
      disabled={busy || disabled || step === 'success'}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded border font-mono text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        step === 'success'
          ? 'bg-stellar-green/10 border-stellar-green/30 text-stellar-green'
          : bgClass
      }`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> :
       step === 'success' ? <CheckCircle2 size={14} /> : icon}
      {step === 'success' ? 'Done!' : busy ? 'Processing…' : label}
    </button>
  )
}

function TxStatusBar({ step }: { step: TxStep }) {
  const map: Record<TxStep, { label: string; color: string }> = {
    idle: { label: '', color: '' },
    building: { label: '① Building transaction…', color: 'text-stellar-yellow' },
    signing: { label: '② Waiting for Freighter signature…', color: 'text-stellar-orange' },
    submitting: { label: '③ Submitting to Stellar network…', color: 'text-stellar-teal' },
    success: { label: '✓ Transaction confirmed', color: 'text-stellar-green' },
    error: { label: '✗ Transaction failed', color: 'text-stellar-red' },
  }
  const { label, color } = map[step]
  if (!label) return null
  return (
    <div className={`flex items-center gap-2 text-xs font-mono ${color}`}>
      {['building', 'signing', 'submitting'].includes(step) && (
        <Loader2 size={11} className="animate-spin flex-shrink-0" />
      )}
      {label}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-stellar-muted text-xs mb-0.5">{label}</p>
      <p className="text-stellar-text truncate">{value}</p>
    </div>
  )
}
