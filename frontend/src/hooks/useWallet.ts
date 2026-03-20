import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────
interface WalletState {
  isConnected: boolean
  publicKey: string | null
  network: string | null
  networkPassphrase: string | null
  isLoading: boolean
  error: string | null

  connect: () => Promise<void>
  disconnect: () => void
  signTransaction: (xdr: string) => Promise<string>
  isFreighterInstalled: () => boolean
}

// ─── Freighter API helpers (dynamic import avoids SSR issues) ────────────────
const getFreighter = async () => {
  try {
    // @ts-ignore – freighter injects into window
    if (typeof window.freighter !== 'undefined') return window.freighter
    const mod = await import('@stellar/freighter-api')
    return mod
  } catch {
    return null
  }
}

// ─── Zustand store ────────────────────────────────────────────────────────────
export const useWalletStore = create<WalletState>((set, get) => ({
  isConnected: false,
  publicKey: null,
  network: null,
  networkPassphrase: null,
  isLoading: false,
  error: null,

  isFreighterInstalled: () => {
    if (typeof window === 'undefined') return false
    // @ts-ignore
    return typeof window.freighter !== 'undefined' || typeof window.freighterApi !== 'undefined'
  },

  connect: async () => {
    set({ isLoading: true, error: null })
    try {
      const freighter = await getFreighter()
      if (!freighter) throw new Error('Freighter wallet not installed. Install it from freighter.app')

      // Request access
      const isAllowed = await freighter.isAllowed()
      if (!isAllowed) {
        await freighter.setAllowed()
      }

      // Get public key
      const publicKey = await freighter.getPublicKey()
      if (!publicKey) throw new Error('Could not retrieve public key from Freighter')

      // Get network
      const networkDetails = await freighter.getNetworkDetails()

      set({
        isConnected: true,
        publicKey,
        network: networkDetails?.network || 'TESTNET',
        networkPassphrase: networkDetails?.networkPassphrase || '',
        isLoading: false,
        error: null,
      })

      // Persist to sessionStorage
      sessionStorage.setItem('stellar_wallet_pk', publicKey)
    } catch (err: any) {
      set({ isLoading: false, error: err.message, isConnected: false })
    }
  },

  disconnect: () => {
    sessionStorage.removeItem('stellar_wallet_pk')
    set({
      isConnected: false,
      publicKey: null,
      network: null,
      networkPassphrase: null,
      error: null,
    })
  },

  signTransaction: async (xdr: string) => {
    const { publicKey, networkPassphrase } = get()
    if (!publicKey) throw new Error('Wallet not connected')

    const freighter = await getFreighter()
    if (!freighter) throw new Error('Freighter not found')

    const signed = await freighter.signTransaction(xdr, {
      network: 'TESTNET',
      networkPassphrase: networkPassphrase || '',
      accountToSign: publicKey,
    })

    return signed
  },
}))

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWallet() {
  return useWalletStore()
}
