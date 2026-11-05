// GET /api/endpoints: endpoint race — every configured RPC per chain,
// head height + latency, spread and stale flags. Mirrors src/server.js.
import { raceEndpoints } from '../src/poller.js';

export default async (req, res) => {
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  try {
    res.statusCode = 200;
    return res.end(JSON.stringify(await raceEndpoints()));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: e.message }));
  }
};
