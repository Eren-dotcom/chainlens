// GET /api/badge (rewritten from /api/badge.svg): shields-style SVG badge
// with the chain's latest measured finality. Mirrors src/server.js.
import { sampleOnce } from './_state.js';
import { badgeSvg } from '../src/metrics.js';
import { CHAINS } from '../src/chains.js';

export default async (req, res) => {
  const cfg = CHAINS.find((c) => c.key === new URL(req.url, 'http://localhost').searchParams.get('chain'));
  if (!cfg) {
    res.statusCode = 400;
    res.setHeader('content-type', 'text/plain');
    return res.end('unknown chain');
  }
  const p = await sampleOnce();
  res.statusCode = 200;
  res.setHeader('content-type', 'image/svg+xml');
  res.setHeader('cache-control', 'public, max-age=30');
  return res.end(badgeSvg(cfg, p.latest?.chains?.[cfg.key]));
};
