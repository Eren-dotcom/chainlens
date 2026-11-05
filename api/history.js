import { respond } from './_state.js';

export default (req, res) => {
  const nRaw = Number(new URL(req.url, 'http://localhost').searchParams.get('n') ?? 50);
  const n = Number.isFinite(nRaw) ? Math.min(200, Math.max(1, Math.floor(nRaw))) : 50;
  return respond(res, (p) => ({ samples: p.history.slice(-n) }));
};
