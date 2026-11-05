// GET /api/anchor: FinalityAnchor bytecode + ABI for the deploy-it-yourself
// flow. The visitor's own wallet signs; ChainLens stays read-only.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));

export default async (req, res) => {
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  try {
    const bcRaw = await readFile(join(dir, '..', 'contracts', 'FinalityAnchor.bytecode.txt'), 'utf8');
    const abiRaw = await readFile(join(dir, '..', 'contracts', 'FinalityAnchor.abi.json'), 'utf8');
    const bytecode = '0x' + bcRaw.trim();
    res.statusCode = 200;
    return res.end(JSON.stringify({
      contract: 'FinalityAnchor', chainId: 420420777, network: 'Portaldot V3 Testnet',
      rpc: 'https://test-evm-rpc-v3.portaldot.dev', bytecode,
      bytecodeBytes: (bytecode.length - 2) / 2, abi: JSON.parse(abiRaw),
      source: 'contracts/FinalityAnchor.sol', statusDoc: 'docs/ANCHOR-STATUS.md',
    }));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: e.message }));
  }
};
