export const STELLAR_NETWORK = 'testnet' as const;
export const SUPPORTED_STELLAR_NETWORKS = ['testnet', 'mainnet'] as const;

// Wallet challenges are created by the Blux API and may target either of the
// supported networks. Testnet remains the default for new sessions.
export const BLUX_LOGIN_METHODS = [
  'wallet',
  'email',
  'passkey',
  'google',
] as const;
