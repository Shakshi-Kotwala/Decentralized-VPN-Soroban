import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import {
  SorobanRpc,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Address,
  xdr,
  nativeToScVal,
  scValToNative,
  Horizon,
} from '@stellar/stellar-sdk'

// ─── Config ───────────────────────────────────────────────────────────────────
const CONTRACT_ID = 'CCASXTFSH64EVAK4UWUW6SN2MUYZZWKCNK2W3I3RFH7NZ6QO3YFJDXTW'
const RPC_URL = 'https://soroban-testnet.stellar.org'
const HORIZON_URL = 'https://horizon-testnet.stellar.org'
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015'
const PORT = process.env.PORT || 4000

const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false })
const horizon = new Horizon.Server(HORIZON_URL)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addrScVal(pk: string) {
  return nativeToScVal(new Address(pk), { type: 'address' })
}

async function simulateCall(method: string, args: xdr.ScVal[], callerKey: string) {
  const account = await rpc.getAccount(callerKey)
  const contract = new Contract(CONTRACT_ID)
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const sim = await rpc.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`)
  }
  return sim
}

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express()
app.use(cors({ origin: ['http://localhost:3000', 'https://*.vercel.app'] }))
app.use(express.json())

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    contract: CONTRACT_ID,
    network: 'testnet',
    rpc: RPC_URL,
    ts: new Date().toISOString(),
  })
})

// ─── GET /api/contract — contract metadata ─────────────────────────────────────
app.get('/api/contract', (_req, res) => {
  res.json({
    contractId: CONTRACT_ID,
    network: 'testnet',
    explorerUrl: `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`,
    functions: [
      { name: 'subscribe', type: 'write', args: ['user: Address'] },
      { name: 'is_subscribed', type: 'read', args: ['user: Address'], returns: 'bool' },
      { name: 'register_node', type: 'write', args: ['provider: Address', 'endpoint: Symbol'] },
      { name: 'get_node', type: 'read', args: ['provider: Address'], returns: 'Symbol' },
    ],
  })
})

// ─── GET /api/account/:address — balance + contract state ─────────────────────
app.get('/api/account/:address', async (req, res) => {
  const { address } = req.params
  try {
    // Balance
    let balance = '0'
    try {
      const acct = await horizon.loadAccount(address)
      const native = acct.balances.find((b: any) => b.asset_type === 'native')
      balance = native ? parseFloat(native.balance).toFixed(4) : '0'
    } catch { /* account may not be funded */ }

    // is_subscribed (use address itself as caller)
    let subscribed = false
    try {
      const sim = await simulateCall('is_subscribed', [addrScVal(address)], address)
      // @ts-ignore
      const rv = sim.result?.retval
      subscribed = rv ? (scValToNative(rv) as boolean) : false
    } catch { /* not found */ }

    // get_node
    let node: string | null = null
    try {
      const sim2 = await simulateCall('get_node', [addrScVal(address)], address)
      // @ts-ignore
      const rv2 = sim2.result?.retval
      if (rv2) {
        const v = scValToNative(rv2)
        node = v ? String(v) : null
        if (node === 'none') node = null
      }
    } catch { /* no node */ }

    res.json({ address, balance, subscribed, node })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/prepare — build XDR ready for Freighter signing ────────────────
// Body: { method: string, args: any[], callerAddress: string }
app.post('/api/prepare', async (req, res) => {
  const { method, args = [], callerAddress } = req.body
  if (!method || !callerAddress) {
    return res.status(400).json({ error: 'method and callerAddress are required' })
  }

  const WRITE_METHODS = ['subscribe', 'register_node']
  if (!WRITE_METHODS.includes(method)) {
    return res.status(400).json({ error: `${method} is not a write function` })
  }

  try {
    // Build args
    let scArgs: xdr.ScVal[] = []
    if (method === 'subscribe') {
      scArgs = [addrScVal(callerAddress)]
    } else if (method === 'register_node') {
      const [, endpoint] = args
      scArgs = [addrScVal(callerAddress), xdr.ScVal.scvSymbol(endpoint)]
    }

    const account = await rpc.getAccount(callerAddress)
    const contract = new Contract(CONTRACT_ID)
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...scArgs))
      .setTimeout(30)
      .build()

    const sim = await rpc.simulateTransaction(tx)
    if (SorobanRpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation failed: ${sim.error}`)
    }

    const prepared = SorobanRpc.assembleTransaction(tx, sim).build()
    res.json({ xdr: prepared.toXDR(), fee: prepared.fee })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/submit — submit signed XDR ─────────────────────────────────────
// Body: { signedXdr: string }
app.post('/api/submit', async (req, res) => {
  const { signedXdr } = req.body
  if (!signedXdr) return res.status(400).json({ error: 'signedXdr is required' })

  try {
    const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
    const result = await rpc.sendTransaction(tx)

    if (result.status === 'ERROR') {
      return res.status(400).json({ error: 'Submit failed', detail: result.errorResult })
    }

    // Poll
    const hash = result.hash
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1500))
      const status = await rpc.getTransaction(hash)
      if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        return res.json({ success: true, hash })
      }
      if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        return res.status(400).json({ error: 'Transaction failed', hash })
      }
    }
    res.status(408).json({ error: 'Timeout', hash })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/simulate/:method — read-only simulation ─────────────────────────
// Query: ?address=G...&callerAddress=G...
app.get('/api/simulate/:method', async (req, res) => {
  const { method } = req.params
  const { address, callerAddress } = req.query as { address?: string; callerAddress?: string }

  const READ_METHODS = ['is_subscribed', 'get_node']
  if (!READ_METHODS.includes(method)) {
    return res.status(400).json({ error: `${method} is not a read function` })
  }
  if (!address || !callerAddress) {
    return res.status(400).json({ error: 'address and callerAddress query params required' })
  }

  try {
    const sim = await simulateCall(method, [addrScVal(address)], callerAddress)
    // @ts-ignore
    const rv = sim.result?.retval
    const result = rv ? scValToNative(rv) : null
    res.json({ method, address, result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 dVPN Backend running at http://localhost:${PORT}`)
  console.log(`📋 Contract: ${CONTRACT_ID}`)
  console.log(`🌐 Network:  Stellar Testnet\n`)
})
