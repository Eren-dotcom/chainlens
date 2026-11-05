// HTTP server: comparison dashboard + JSON APIs. Zero dependencies.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Poller, sampleChain, raceEndpoints, checkFinality } from './poller.js';
import { shapeMetrics, summarize, historyToCsv, badgeSvg } from './metrics.js';
import { CHAINS } from './chains.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const portRaw = Number(process.env.PORT || 4178);
const PORT = Number.isFinite(portRaw) && portRaw > 0 && portRaw < 65536 ? portRaw : 4178;

const poller = new Poller().start();
let anchorData = null;
try {
  const bcRaw = await readFile(join(__dirname, '..', 'contracts', 'FinalityAnchor.bytecode.txt'), 'utf8');
  const abiRaw = await readFile(join(__dirname, '..', 'contracts', 'FinalityAnchor.abi.json'), 'utf8');
  const bytecode = '0x' + bcRaw.trim();
  anchorData = {
    contract: 'FinalityAnchor', chainId: 420420777, network: 'Portaldot V3 Testnet',
    rpc: 'https://test-evm-rpc-v3.portaldot.dev', bytecode,
    bytecodeBytes: (bytecode.length - 2) / 2, abi: JSON.parse(abiRaw),
    source: 'contracts/FinalityAnchor.sol', statusDoc: 'docs/ANCHOR-STATUS.md',
  };
} catch { anchorData = null; }
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

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/status') {
    return sendJson(res, 200, { ...poller.status(), stats: summarize(poller.history) });
  }
  if (url.pathname === '/api/metrics') return sendJson(res, 200, shapeMetrics(poller.latest));
  if (url.pathname === '/api/history') {
    const nRaw = Number(url.searchParams.get('n') ?? 50);
    const n = Number.isFinite(nRaw) ? Math.min(200, Math.max(1, Math.floor(nRaw))) : 50;
    return sendJson(res, 200, { samples: poller.history.slice(-n) });
  }
  if (url.pathname === '/api/history.csv') {
    res.writeHead(200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="chainlens-history.csv"',
      'cache-control': 'no-store',
    });
    return res.end(historyToCsv(poller.history));
  }
  if (url.pathname === '/api/badge.svg') {
    const cfg = CHAINS.find((c) => c.key === url.searchParams.get('chain'));
    if (!cfg) {
      res.writeHead(400, { 'content-type': 'text/plain' });
      return res.end('unknown chain');
    }
    res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=30' });
    return res.end(badgeSvg(cfg, poller.latest?.chains?.[cfg.key]));
  }
  if (url.pathname === '/api/sample') {
    const key = url.searchParams.get('chain');
    if (!CHAINS.some((c) => c.key === key)) return sendJson(res, 400, { error: 'unknown chain' });
    try {
      return sendJson(res, 200, await sampleChain(key));
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }
  if (url.pathname === '/api/endpoints') {
    try { return sendJson(res, 200, await raceEndpoints()); }
    catch (e) { return sendJson(res, 500, { error: e.message }); }
  }
  if (url.pathname === '/api/check') {
    const key = url.searchParams.get('chain');
    const blockRaw = url.searchParams.get('block');
    const tx = url.searchParams.get('tx');
    if (!CHAINS.some((c) => c.key === key)) return sendJson(res, 400, { error: 'unknown chain' });
    if ((blockRaw == null) === (tx == null)) return sendJson(res, 400, { error: 'exactly one of block or tx is required' });
    if (tx != null) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) return sendJson(res, 400, { error: 'tx must be a 0x-prefixed 64-hex transaction hash' });
      return sendJson(res, 200, await checkFinality(key, { tx }));
    }
    if (!/^\d+$/.test(blockRaw)) return sendJson(res, 400, { error: 'block must be a non-negative integer' });
    return sendJson(res, 200, await checkFinality(key, { block: Number(blockRaw) }));
  }
  if (url.pathname === '/api/anchor') {
    if (!anchorData) return sendJson(res, 500, { error: 'anchor contract files missing' });
    return sendJson(res, 200, anchorData);
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
  console.log('Watching 9 chains — Portaldot V3, Sepolia, Base Sepolia, Amoy, Arbitrum Sepolia, OP Sepolia, Ethereum, Base, Polygon (read-only RPC)');
});
