/**
 * DecentralizedVPN Contract Client
 * Contract: CCASXTFSH64EVAK4UWUW6SN2MUYZZWKCNK2W3I3RFH7NZ6QO3YFJDXTW
 * Network: Stellar Testnet
 */

import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  Address,
  xdr,
  nativeToScVal,
  scValToNative,
  Horizon,
} from '@stellar/stellar-sdk'

import {
  CONTRACT_ID,
  RPC_URL,
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  CONTRACT_FUNCTIONS,
} from './contract.config'

// ─── Clients ─────────────────────────────────────────────────────────────────
export const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false })
export const horizon = new Horizon.Server(HORIZON_URL)

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function addressToScVal(publicKey: string) {
  return nativeToScVal(new Address(publicKey), { type: 'address' })
}

async function buildTx(method: string, args: xdr.ScVal[], sourcePublicKey: string) {
  const account = await rpc.getAccount(sourcePublicKey)
  const contract = new Contract(CONTRACT_ID)
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()
}

// ─── Simulate only (read calls) ───────────────────────────────────────────────
async function simulateRead(method: string, args: xdr.ScVal[], dummyKey: string) {
  const tx = await buildTx(method, args, dummyKey)
  const sim = await rpc.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`)
  }
  return sim
}

// ─── Prepare XDR for signing (write calls) ────────────────────────────────────
export async function prepareXdr(method: string, args: xdr.ScVal[], sourcePublicKey: string) {
  const tx = await buildTx(method, args, sourcePublicKey)
  const sim = await rpc.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`)
  }
  const prepared = SorobanRpc.assembleTransaction(tx, sim).build()
  return prepared.toXDR()
}

// ─── Submit signed XDR and poll for result ────────────────────────────────────
export async function submitSignedXdr(signedXdr: string): Promise<string> {
  const { TransactionBuilder: TB } = await import('@stellar/stellar-sdk')
  const tx = TB.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  const result = await rpc.sendTransaction(tx)

  if (result.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(result.errorResult)}`)
  }

  const hash = result.hash
  for (let i = 0; i < 20; i++) {
    await sleep(1500)
    const status = await rpc.getTransaction(hash)
    if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) return hash
    if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${hash}`)
    }
  }
  throw new Error(`Timeout waiting for transaction: ${hash}`)
}

// ─── Account balance ──────────────────────────────────────────────────────────
export async function getXlmBalance(publicKey: string): Promise<string> {
  try {
    const account = await horizon.loadAccount(publicKey)
    const native = account.balances.find((b: any) => b.asset_type === 'native')
    return native ? parseFloat(native.balance).toFixed(4) : '0.0000'
  } catch {
    return '0.0000'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONTRACT FUNCTION WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * subscribe(user: Address) — registers a user as subscribed
 * Returns XDR string ready for Freighter signing
 */
export async function buildSubscribeTx(userPublicKey: string): Promise<string> {
  return prepareXdr(
    CONTRACT_FUNCTIONS.SUBSCRIBE,
    [addressToScVal(userPublicKey)],
    userPublicKey
  )
}

/**
 * is_subscribed(user: Address) -> bool — read call (no signing needed)
 */
export async function isSubscribed(userPublicKey: string, callerKey?: string): Promise<boolean> {
  const caller = callerKey || userPublicKey
  const sim = await simulateRead(
    CONTRACT_FUNCTIONS.IS_SUBSCRIBED,
    [addressToScVal(userPublicKey)],
    caller
  )
  // @ts-ignore
  const retVal = sim.result?.retval
  if (!retVal) return false
  return scValToNative(retVal) as boolean
}

/**
 * register_node(provider: Address, endpoint: Symbol) — returns XDR for signing
 */
export async function buildRegisterNodeTx(
  providerPublicKey: string,
  endpoint: string
): Promise<string> {
  return prepareXdr(
    CONTRACT_FUNCTIONS.REGISTER_NODE,
    [
      addressToScVal(providerPublicKey),
      xdr.ScVal.scvSymbol(endpoint),
    ],
    providerPublicKey
  )
}

/**
 * get_node(provider: Address) -> Symbol — read call
 */
export async function getNode(providerPublicKey: string, callerKey?: string): Promise<string | null> {
  const caller = callerKey || providerPublicKey
  try {
    const sim = await simulateRead(
      CONTRACT_FUNCTIONS.GET_NODE,
      [addressToScVal(providerPublicKey)],
      caller
    )
    // @ts-ignore
    const retVal = sim.result?.retval
    if (!retVal) return null
    const val = scValToNative(retVal)
    return val ? String(val) : null
  } catch {
    return null
  }
}
