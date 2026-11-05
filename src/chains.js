// The chains ChainLens watches. All endpoints are public, read-only RPCs;
// every URL can be overridden by an environment variable.
// Verified reachable on 2026-11-05 (chain IDs checked against the network).

export const CHAINS = [
  {
    key: 'portaldot',
    name: 'Portaldot V3 Testnet',
    short: 'Portaldot V3',
    chainId: 420420777,
    rpc: process.env.PORTALDOT_RPC || 'https://test-evm-rpc-v3.portaldot.dev',
    substrateRpc: process.env.PORTALDOT_SUBSTRATE_RPC || 'https://test-node-v3.portaldot.dev',
    highlight: true, // the home chain: dual EVM + Substrate reads, finality cross-checked
  },
  {
    key: 'sepolia',
    name: 'Ethereum Sepolia',
    short: 'Sepolia',
    chainId: 11155111,
    rpc: process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com',
  },
  {
    key: 'base',
    name: 'Base Sepolia',
    short: 'Base Sepolia',
    chainId: 84532,
    rpc: process.env.BASE_RPC || 'https://base-sepolia-rpc.publicnode.com',
  },
  {
    key: 'amoy',
    name: 'Polygon Amoy',
    short: 'Amoy',
    chainId: 80002,
    rpc: process.env.AMOY_RPC || 'https://polygon-amoy-bor-rpc.publicnode.com',
    // Bor finalizes through Heimdall checkpoints, not the EVM 'finalized'
    // tag — the tag just echoes the latest block there, which would fake a
    // 0-second finality. ChainLens reports finality as n/a for Amoy instead.
    finalityTag: false,
    finalityNote: 'Bor finalizes via Heimdall checkpoints (minutes), not the EVM finalized tag — reported as n/a rather than a fake zero.',
  },
];
