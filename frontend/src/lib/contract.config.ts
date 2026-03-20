// ============================================================
//  DEPLOYED CONTRACT CONFIGURATION
//  Decentralized VPN — Stellar Soroban Testnet
//  Source: https://github.com/Shakshi-Kotwala/Decentralized-VPN
// ============================================================

export const CONTRACT_CONFIG = {
  // ✅ Deployed contract on Stellar Testnet
  CONTRACT_ID: 'CCASXTFSH64EVAK4UWUW6SN2MUYZZWKCNK2W3I3RFH7NZ6QO3YFJDXTW',

  NETWORK: 'testnet' as const,

  RPC_URLS: {
    testnet: 'https://soroban-testnet.stellar.org',
    mainnet: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
    futurenet: 'https://rpc-futurenet.stellar.org',
  },

  HORIZON_URLS: {
    testnet: 'https://horizon-testnet.stellar.org',
    mainnet: 'https://horizon.stellar.org',
    futurenet: 'https://horizon-futurenet.stellar.org',
  },

  NETWORK_PASSPHRASES: {
    testnet: 'Test SDF Network ; September 2015',
    mainnet: 'Public Global Stellar Network ; September 2015',
    futurenet: 'Test SDF Future Network ; October 2022',
  },

  EXPLORER_URL: 'https://stellar.expert/explorer/testnet/contract/CCASXTFSH64EVAK4UWUW6SN2MUYZZWKCNK2W3I3RFH7NZ6QO3YFJDXTW',
}

export const RPC_URL = CONTRACT_CONFIG.RPC_URLS[CONTRACT_CONFIG.NETWORK]
export const HORIZON_URL = CONTRACT_CONFIG.HORIZON_URLS[CONTRACT_CONFIG.NETWORK]
export const NETWORK_PASSPHRASE = CONTRACT_CONFIG.NETWORK_PASSPHRASES[CONTRACT_CONFIG.NETWORK]
export const CONTRACT_ID = CONTRACT_CONFIG.CONTRACT_ID

// ─── Contract ABI (function signatures) ──────────────────────────────────────
export const CONTRACT_FUNCTIONS = {
  SUBSCRIBE: 'subscribe',
  IS_SUBSCRIBED: 'is_subscribed',
  REGISTER_NODE: 'register_node',
  GET_NODE: 'get_node',
} as const
