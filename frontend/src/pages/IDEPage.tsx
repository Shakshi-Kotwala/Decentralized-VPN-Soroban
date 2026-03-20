import { useState, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { useWallet } from '../hooks/useWallet'
import {
  buildSubscribeTx, buildRegisterNodeTx,
  isSubscribed, getNode, submitSignedXdr,
} from '../lib/vpnContract'
import {
  Play, Terminal, Clipboard, ChevronRight,
  Loader2, CheckCircle2, AlertCircle, Trash2, Copy,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { CONTRACT_ID } from '../lib/contract.config'
import { AnimatePresence, motion } from 'framer-motion'

// ─── The Soroban Rust contract source (read-only display) ─────────────────────
const CONTRACT_SOURCE = `#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[contract]
pub struct DecentralizedVPN;

#[contractimpl]
impl DecentralizedVPN {
    /// Register user as subscribed to VPN services
    pub fn subscribe(env: Env, user: Address) {
        user.require_auth();
        env.storage().persistent().set(&user, &true);
    }

    /// Check if a user is subscribed
    pub fn is_subscribed(env: Env, user: Address) -> bool {
        env.storage().persistent().get(&user).unwrap_or(false)
    }

    /// Register a VPN node endpoint for a provider
    pub fn register_node(env: Env, provider: Address, endpoint: Symbol) {
        provider.require_auth();
        env.storage().persistent().set(&provider, &endpoint);
    }

    /// Get the VPN node endpoint for a provider
    pub fn get_node(env: Env, provider: Address) -> Symbol {
        env.storage()
            .persistent()
            .get(&provider)
            .unwrap_or(Symbol::new(&env, "none"))
    }
}
`

// ─── Predefined invocations ───────────────────────────────────────────────────
const SNIPPETS = [
  {
    id: 'subscribe',
    label: 'subscribe()',
    description: 'Subscribe your wallet to dVPN',
    type: 'write',
    color: 'accent',
  },
  {
    id: 'is_subscribed',
    label: 'is_subscribed(address)',
    description: 'Check subscription status',
    type: 'read',
    color: 'teal',
  },
  {
    id: 'register_node',
    label: 'register_node(address, endpoint)',
    description: 'Register your VPN node',
    type: 'write',
    color: 'accent',
  },
  {
    id: 'get_node',
    label: 'get_node(address)',
    description: 'Get node endpoint for provider',
    type: 'read',
    color: 'teal',
  },
]

interface LogEntry {
  id: number
  type: 'info' | 'success' | 'error' | 'tx' | 'result'
  message: string
  ts: string
}

let logId = 0

// ─── IDE Page ─────────────────────────────────────────────────────────────────
export function IDEPage() {
  const { isConnected, publicKey, signTransaction } = useWallet()
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 0,
      type: 'info',
      message: `Connected to contract ${CONTRACT_ID}`,
      ts: new Date().toLocaleTimeString(),
    },
  ])
  const [activeSnippet, setActiveSnippet] = useState<string | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [running, setRunning] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const addLog = (type: LogEntry['type'], message: string) => {
    const entry: LogEntry = {
      id: ++logId,
      type,
      message,
      ts: new Date().toLocaleTimeString(),
    }
    setLogs((l) => [...l, entry])
    setTimeout(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  const clearLogs = () => setLogs([])

  const copyLogs = () => {
    const text = logs.map((l) => `[${l.ts}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Logs copied')
  }

  const runSnippet = async () => {
    if (!activeSnippet || !publicKey) return
    setRunning(true)
    addLog('info', `► Invoking ${activeSnippet}(${inputVal || ''})`)

    try {
      if (activeSnippet === 'subscribe') {
        addLog('info', 'Building transaction…')
        const xdr = await buildSubscribeTx(publicKey)
        addLog('info', 'Requesting Freighter signature…')
        const signed = await signTransaction(xdr)
        addLog('info', 'Submitting to Stellar testnet…')
        const hash = await submitSignedXdr(signed)
        addLog('success', `✓ Subscribed! Tx: ${hash}`)
        addLog('result', `Return: void`)

      } else if (activeSnippet === 'is_subscribed') {
        const addr = inputVal.trim() || publicKey
        addLog('info', `Simulating is_subscribed(${addr.slice(0, 10)}…)`)
        const result = await isSubscribed(addr, publicKey)
        addLog('result', `Return: ${result}`)
        addLog(result ? 'success' : 'info', result ? '✓ Address is subscribed' : '○ Not subscribed')

      } else if (activeSnippet === 'register_node') {
        const ep = inputVal.trim() || 'node1'
        addLog('info', `Building register_node("${ep}")…`)
        const { buildRegisterNodeTx: build } = await import('../lib/vpnContract')
        const xdr = await build(publicKey, ep)
        addLog('info', 'Requesting Freighter signature…')
        const signed = await signTransaction(xdr)
        addLog('info', 'Submitting to Stellar testnet…')
        const hash = await submitSignedXdr(signed)
        addLog('success', `✓ Node "${ep}" registered! Tx: ${hash}`)
        addLog('result', `Return: void`)

      } else if (activeSnippet === 'get_node') {
        const addr = inputVal.trim() || publicKey
        addLog('info', `Simulating get_node(${addr.slice(0, 10)}…)`)
        const result = await getNode(addr, publicKey)
        addLog('result', `Return: ${result ?? 'none'}`)
        addLog(result ? 'success' : 'info', result ? `✓ Node: ${result}` : '○ No node registered')
      }
    } catch (err: any) {
      addLog('error', `✗ ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  const snippet = SNIPPETS.find((s) => s.id === activeSnippet)
  const needsInput = activeSnippet === 'is_subscribed' || activeSnippet === 'get_node' || activeSnippet === 'register_node'
  const inputLabel = activeSnippet === 'register_node' ? 'endpoint' : 'address'
  const inputPlaceholder = activeSnippet === 'register_node'
    ? 'e.g. vpn.mynode.io'
    : `Stellar address (leave blank to use your wallet)`

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left: Source code ── */}
      <div className="flex flex-col w-[55%] border-r border-stellar-border">
        <div className="panel-header flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-stellar-red" />
          <div className="w-2 h-2 rounded-full bg-stellar-yellow" />
          <div className="w-2 h-2 rounded-full bg-stellar-green" />
          <span className="ml-2 text-xs font-mono text-stellar-muted">src/lib.rs</span>
          <span className="ml-auto text-xs font-mono text-stellar-muted">Rust · Soroban SDK</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="rust"
            value={CONTRACT_SOURCE}
            options={{
              readOnly: true,
              theme: 'vs-dark',
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              renderLineHighlight: 'line',
              folding: true,
              wordWrap: 'on',
              padding: { top: 12 },
            }}
            beforeMount={(monaco) => {
              monaco.editor.defineTheme('stellar-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                  { token: 'keyword', foreground: '7B68EE', fontStyle: 'bold' },
                  { token: 'string', foreground: '00ff9f' },
                  { token: 'comment', foreground: '4a4a6a', fontStyle: 'italic' },
                  { token: 'type', foreground: '00b4d8' },
                  { token: 'function', foreground: 'ffd60a' },
                ],
                colors: {
                  'editor.background': '#0f0f1a',
                  'editor.foreground': '#c8c8e8',
                  'editor.lineHighlightBackground': '#1e1e3020',
                  'editorLineNumber.foreground': '#2e2e50',
                  'editorLineNumber.activeForeground': '#7B68EE',
                  'editor.selectionBackground': '#7B68EE30',
                },
              })
              monaco.editor.setTheme('stellar-dark')
            }}
          />
        </div>
      </div>

      {/* ── Right: Invocation panel + Console ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Functions */}
        <div className="flex-shrink-0 border-b border-stellar-border">
          <div className="panel-header">
            <Terminal size={13} className="text-stellar-accent" />
            <span className="text-xs font-mono text-stellar-text">Contract Functions</span>
          </div>
          <div className="p-3 space-y-2">
            {SNIPPETS.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveSnippet(s.id); setInputVal('') }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded border text-left transition-all ${
                  activeSnippet === s.id
                    ? 'border-stellar-accent/50 bg-stellar-accent/10'
                    : 'border-stellar-border hover:border-stellar-border/80 hover:bg-stellar-border/20'
                }`}
              >
                <ChevronRight
                  size={12}
                  className={activeSnippet === s.id ? 'text-stellar-accent' : 'text-stellar-muted'}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-stellar-text">{s.label}</span>
                  <span className="block text-xs text-stellar-muted truncate">{s.description}</span>
                </div>
                <span className={`text-xs font-mono flex-shrink-0 px-1.5 py-0.5 rounded ${
                  s.type === 'write'
                    ? 'bg-stellar-accent/10 text-stellar-accent border border-stellar-accent/20'
                    : 'bg-stellar-teal/10 text-stellar-teal border border-stellar-teal/20'
                }`}>
                  {s.type}
                </span>
              </button>
            ))}
          </div>

          {/* Input + Run */}
          <AnimatePresence>
            {activeSnippet && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-3 pb-3 space-y-2 overflow-hidden"
              >
                {needsInput && (
                  <div>
                    <label className="text-xs font-mono text-stellar-muted block mb-1">
                      {inputLabel}
                    </label>
                    <input
                      type="text"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      placeholder={inputPlaceholder}
                      className="w-full px-3 py-2 bg-stellar-black border border-stellar-border rounded font-mono text-xs text-stellar-text placeholder:text-stellar-muted/40 focus:outline-none focus:border-stellar-accent/40"
                    />
                  </div>
                )}
                <button
                  onClick={runSnippet}
                  disabled={running || !isConnected}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stellar-accent hover:bg-stellar-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-mono text-sm transition-all"
                >
                  {running
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Play size={14} />}
                  {running ? 'Running…' : `Run ${snippet?.label}`}
                </button>
                {!isConnected && (
                  <p className="text-xs font-mono text-stellar-red text-center">
                    Connect Freighter wallet to invoke functions
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Console */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="panel-header flex-shrink-0">
            <Terminal size={13} className="text-stellar-green" />
            <span className="text-xs font-mono text-stellar-text">Console Output</span>
            <span className="ml-auto flex items-center gap-2">
              <button onClick={copyLogs} className="text-stellar-muted hover:text-stellar-text transition-colors" title="Copy logs">
                <Copy size={12} />
              </button>
              <button onClick={clearLogs} className="text-stellar-muted hover:text-stellar-text transition-colors" title="Clear">
                <Trash2 size={12} />
              </button>
            </span>
          </div>
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs bg-stellar-black"
          >
            {logs.length === 0 && (
              <p className="text-stellar-muted">No output yet. Select a function and run it.</p>
            )}
            {logs.map((log) => (
              <div key={log.id} className={`flex gap-2 ${logColors[log.type]}`}>
                <span className="text-stellar-muted flex-shrink-0">{log.ts}</span>
                <LogIcon type={log.type} />
                <span className="break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const logColors: Record<LogEntry['type'], string> = {
  info: 'text-stellar-text',
  success: 'text-stellar-green',
  error: 'text-stellar-red',
  tx: 'text-stellar-teal',
  result: 'text-stellar-yellow',
}

function LogIcon({ type }: { type: LogEntry['type'] }) {
  if (type === 'success') return <CheckCircle2 size={11} className="flex-shrink-0 mt-0.5" />
  if (type === 'error') return <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
  if (type === 'result') return <ChevronRight size={11} className="flex-shrink-0 mt-0.5" />
  return <span className="w-[11px] flex-shrink-0" />
}
