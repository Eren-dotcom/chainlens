// GET /api/check?chain=<id>&block=<n> | &tx=<0xhash>: is this block final
// yet? Fresh reads on the chain's primary RPC. Mirrors src/server.js.
import { checkFinality } from '../src/poller.js';
import { CHAINS } from '../src/chains.js';

export default async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const key = u.searchParams.get('chain');
  const blockRaw = u.searchParams.get('block');
  const tx = u.searchParams.get('tx');
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  const bad = (msg) => { res.statusCode = 400; return res.end(JSON.stringify({ error: msg })); };
  if (!CHAINS.some((c) => c.key === key)) return bad('unknown chain');
  if ((blockRaw == null) === (tx == null)) return bad('exactly one of block or tx is required');
  if (tx != null) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) return bad('tx must be a 0x-prefixed 64-hex transaction hash');
    res.statusCode = 200;
    return res.end(JSON.stringify(await checkFinality(key, { tx })));
  }
  if (!/^\d+$/.test(blockRaw)) return bad('block must be a non-negative integer');
  res.statusCode = 200;
  return res.end(JSON.stringify(await checkFinality(key, { block: Number(blockRaw) })));
};
