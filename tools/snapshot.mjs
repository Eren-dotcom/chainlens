// Hourly open-dataset snapshot: appends one JSON line per run to
// data/snapshots.jsonl from the live /api/status document.
// Usage: node tools/snapshot.mjs   (CHAINLENS_URL overrides the base URL)
import { appendFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const base = (process.env.CHAINLENS_URL || 'https://chainlens-five.vercel.app').replace(/\/$/, '');
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

const res = await fetch(base + '/api/status');
if (!res.ok) { console.error(`snapshot failed: HTTP ${res.status} from ${base}`); process.exit(1); }
const st = await res.json();
const latest = st.latest;
if (!latest) { console.error('snapshot failed: server not ready (no sample yet)'); process.exit(1); }

const chains = {};
for (const [key, c] of Object.entries(latest.chains || {})) {
  chains[key] = {
    finalitySec: c.finalitySec ?? null,
    blockTimeSec: c.blockTimeSec ?? null,
    gasWei: c.gasWei ?? null,
    height: c.height ?? null,
  };
}
const line = { ts: latest.ts || new Date().toISOString(), chains };
await mkdir(dir, { recursive: true });
await appendFile(join(dir, 'snapshots.jsonl'), JSON.stringify(line) + '\n');
const parts = Object.entries(chains).map(([k, c]) => `${k} ${c.finalitySec == null ? 'n/a' : c.finalitySec + 's'}`).join(' · ');
console.log(`snapshot ${line.ts} — ${parts}`);
