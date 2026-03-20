import * as StellarSdk from '@stellar/stellar-sdk'
import { CONTRACT_ID, RPC_URL, NETWORK_PASSPHRASE, HORIZON_URL } from './contract.config'

// ─── RPC Server ───────────────────────────────────────────────────────────────
export const rpc = new StellarSdk.SorobanRpc.Server(RPC_URL, { allowHttp: false })
export const horizon = new StellarSdk.Horizon.Server(HORIZON_URL)

// ─── Contract instance (generic — works for any ABI) ──────────────────────────
export function getContractInstance(contractId = CONTRACT_ID) {
  return new StellarSdk.Contract(contractId)
}

// ─── Build + simulate a contract call transaction ─────────────────────────────
export async function simulateContractCall(
  method: string,
  args: StellarSdk.xdr.ScVal[],
  sourcePublicKey: string
) {
  const account = await rpc.getAccount(sourcePublicKey)
  const contract = getContractInstance()

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const simulation = await rpc.simulateTransaction(tx)
  return { tx, simulation }
}

// ─── Submit a signed transaction ──────────────────────────────────────────────
export async function submitTransaction(signedXdr: string) {
  const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  const response = await rpc.sendTransaction(tx)

  // Poll for result
  let attempts = 0
  while (attempts < 20) {
    await sleep(1000)
    const status = await rpc.getTransaction(response.hash)
    if (status.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return { success: true, hash: response.hash, result: status }
    }
    if (status.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${response.hash}`)
    }
    attempts++
  }
  throw new Error('Transaction timeout')
}

// ─── Prepare a transaction for signing (adds fee, resource limits) ─────────────
export async function prepareTransaction(
  method: string,
  args: StellarSdk.xdr.ScVal[],
  sourcePublicKey: string
) {
  const { tx, simulation } = await simulateContractCall(method, args, sourcePublicKey)

  if (StellarSdk.SorobanRpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation failed: ${simulation.error}`)
  }

  const prepared = StellarSdk.SorobanRpc.assembleTransaction(tx, simulation).build()
  return prepared.toXDR()
}

// ─── Get account balance ──────────────────────────────────────────────────────
export async function getAccountBalance(publicKey: string) {
  try {
    const account = await horizon.loadAccount(publicKey)
    const xlmBalance = account.balances.find(
      (b: any) => b.asset_type === 'native'
    )
    return xlmBalance ? parseFloat(xlmBalance.balance).toFixed(4) : '0.0000'
  } catch {
    return '0.0000'
  }
}

// ─── Get contract storage / state ─────────────────────────────────────────────
export async function getContractState(contractId = CONTRACT_ID) {
  try {
    const key = StellarSdk.xdr.LedgerKey.contractData(
      new StellarSdk.xdr.LedgerKeyContractData({
        contract: new StellarSdk.Contract(contractId).address().toScAddress(),
        key: StellarSdk.xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: StellarSdk.xdr.ContractDataDurability.persistent(),
      })
    )
    const response = await rpc.getLedgerEntries(key)
    return response.entries
  } catch (err) {
    return []
  }
}

// ─── Convert JS primitives to ScVal ───────────────────────────────────────────
export const scVal = {
  string: (s: string) => StellarSdk.xdr.ScVal.scvString(s),
  symbol: (s: string) => StellarSdk.xdr.ScVal.scvSymbol(s),
  u64: (n: bigint) => StellarSdk.xdr.ScVal.scvU64(new StellarSdk.xdr.Uint64(n)),
  i128: (n: bigint) => StellarSdk.nativeToScVal(n, { type: 'i128' }),
  address: (pk: string) =>
    StellarSdk.nativeToScVal(new StellarSdk.Address(pk), { type: 'address' }),
  bool: (b: boolean) => StellarSdk.xdr.ScVal.scvBool(b),
  void: () => StellarSdk.xdr.ScVal.scvVoid(),
}

// ─── Parse ScVal back to JS ────────────────────────────────────────────────────
export function scValToJs(val: StellarSdk.xdr.ScVal): unknown {
  return StellarSdk.scValToNative(val)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
