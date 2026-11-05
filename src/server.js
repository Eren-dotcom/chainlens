// HTTP server: comparison dashboard + JSON APIs. Zero dependencies.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Poller } from './poller.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const portRaw = Number(process.env.PORT || 4178);
const PORT = Number.isFinite(portRaw) && portRaw > 0 && portRaw < 65536 ? portRaw : 4178;

const poller = new Poller().start();
let indexHtml;
try {
  indexHtml = await readFile(join(__dirname, '..', 'public', 'index.html'), 'utf8');
} catch {
  indexHtml = '<!doctype html><title>ChainLens</title><h1>ChainLens dashboard file missing</h1><p>The JSON APIs at /api/status and /api/history are unaffected.</p>';
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj); // stringify before writeHead: a throw here must not half-send
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/status') return sendJson(res, 200, poller.status());
  if (url.pathname === '/api/history') {
    const nRaw = Number(url.searchParams.get('n') ?? 50);
    const n = Number.isFinite(nRaw) ? Math.min(200, Math.max(1, Math.floor(nRaw))) : 50;
    return sendJson(res, 200, { samples: poller.history.slice(-n) });
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(indexHtml);
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`ChainLens dashboard: http://localhost:${PORT}`);
  console.log('Watching Portaldot V3, Sepolia, Base Sepolia, Polygon Amoy (read-only RPC)');
});
