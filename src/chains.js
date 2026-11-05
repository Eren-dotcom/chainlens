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
    network: 'testnet',
    endpoints: [process.env.PORTALDOT_RPC || 'https://test-evm-rpc-v3.portaldot.dev'],
    highlight: true, // the home chain: dual EVM + Substrate reads, finality cross-checked
  },
  {
    key: 'sepolia',
    name: 'Ethereum Sepolia',
    short: 'Sepolia',
    chainId: 11155111,
    rpc: process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com',
    network: 'testnet',
    endpoints: [process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'],
  },
  {
    key: 'base',
    name: 'Base Sepolia',
    short: 'Base Sepolia',
    chainId: 84532,
    rpc: process.env.BASE_RPC || 'https://base-sepolia-rpc.publicnode.com',
    network: 'testnet',
    endpoints: [process.env.BASE_RPC || 'https://base-sepolia-rpc.publicnode.com', 'https://sepolia.base.org'],
  },
  {
    key: 'amoy',
    name: 'Polygon Amoy',
    short: 'Amoy',
    chainId: 80002,
    rpc: process.env.AMOY_RPC || 'https://polygon-amoy-bor-rpc.publicnode.com',
    network: 'testnet',
    endpoints: [process.env.AMOY_RPC || 'https://polygon-amoy-bor-rpc.publicnode.com', 'https://rpc-amoy.polygon.technology'],
    // Bor finalizes through Heimdall checkpoints, not the EVM 'finalized'
    // tag — the tag just echoes the latest block there, which would fake a
    // 0-second finality. ChainLens reports finality as n/a for Amoy instead.
    finalityTag: false,
    finalityNote: 'Bor finalizes via Heimdall checkpoints (minutes), not the EVM finalized tag — reported as n/a rather than a fake zero.',
  },
  {
    key: 'arbitrum',
    name: 'Arbitrum Sepolia',
    short: 'Arbitrum Sepolia',
    chainId: 421614,
    rpc: process.env.ARBITRUM_RPC || 'https://arbitrum-sepolia-rpc.publicnode.com',
    network: 'testnet',
    endpoints: [process.env.ARBITRUM_RPC || 'https://arbitrum-sepolia-rpc.publicnode.com', 'https://arbitrum-sepolia.drpc.org'],
  },
  {
    key: 'optimism',
    name: 'OP Sepolia',
    short: 'OP Sepolia',
    chainId: 11155420,
    rpc: process.env.OPTIMISM_RPC || 'https://optimism-sepolia-rpc.publicnode.com',
    network: 'testnet',
    endpoints: [process.env.OPTIMISM_RPC || 'https://optimism-sepolia-rpc.publicnode.com'],
  },
  {
    key: 'ethereum',
    name: 'Ethereum',
    short: 'Ethereum',
    chainId: 1,
    rpc: process.env.ETHEREUM_RPC || 'https://ethereum-rpc.publicnode.com',
    network: 'mainnet',
    endpoints: [process.env.ETHEREUM_RPC || 'https://ethereum-rpc.publicnode.com'],
  },
  {
    key: 'base-mainnet',
    name: 'Base',
    short: 'Base',
    chainId: 8453,
    rpc: process.env.BASE_MAINNET_RPC || 'https://base-rpc.publicnode.com',
    network: 'mainnet',
    endpoints: [process.env.BASE_MAINNET_RPC || 'https://base-rpc.publicnode.com'],
  },
  {
    key: 'polygon-mainnet',
    name: 'Polygon',
    short: 'Polygon',
    chainId: 137,
    rpc: process.env.POLYGON_MAINNET_RPC || 'https://polygon-bor-rpc.publicnode.com',
    network: 'mainnet',
    endpoints: [process.env.POLYGON_MAINNET_RPC || 'https://polygon-bor-rpc.publicnode.com'],
    // Bor finalizes through Heimdall checkpoints, not the EVM 'finalized'
    // tag — same reasoning as Amoy.
    finalityTag: false,
    finalityNote: 'Bor finalizes via Heimdall checkpoints (minutes), not the EVM finalized tag — reported as n/a rather than a fake zero.',
  },
];
