// GET /api/history-csv (rewritten from /api/history.csv): CSV export of
// the history ring. Mirrors src/server.js.
import { sampleOnce } from './_state.js';
import { historyToCsv } from '../src/metrics.js';

export default async (req, res) => {
  const p = await sampleOnce();
  res.statusCode = 200;
  res.setHeader('content-type', 'text/csv; charset=utf-8');
  res.setHeader('content-disposition', 'attachment; filename="chainlens-history.csv"');
  res.setHeader('cache-control', 'no-store');
  return res.end(historyToCsv(p.history));
};
