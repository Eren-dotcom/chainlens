// GET /api/sample?chain=<id>: one fresh on-demand sample plus the trimmed
// raw RPC payload it was computed from. Mirrors src/server.js.
import { sampleChain } from '../src/poller.js';
import { CHAINS } from '../src/chains.js';

export default async (req, res) => {
  const key = new URL(req.url, 'http://localhost').searchParams.get('chain');
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  if (!CHAINS.some((c) => c.key === key)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'unknown chain' }));
  }
  try {
    res.statusCode = 200;
    return res.end(JSON.stringify(await sampleChain(key)));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: e.message }));
  }
};
