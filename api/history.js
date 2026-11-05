import { sampleOnce } from './_state.js';

export default async function handler(req, res) {
  const poller = await sampleOnce();
  const nRaw = Number(new URL(req.url, 'http://localhost').searchParams.get('n') ?? 50);
  const n = Number.isFinite(nRaw) ? Math.min(200, Math.max(1, Math.floor(nRaw))) : 50;
  res.setHeader('cache-control', 'no-store');
  res.status(200).json({ samples: poller.history.slice(-n) });
}
