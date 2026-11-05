// Minimal JSON-RPC 2.0 client. Read-only by design:
// ChainLens never signs and never sends a transaction.
// Calls are retried with backoff: public RPC endpoints drop requests
// intermittently, and an observatory should not cry wolf over one drop.
// Only failures that can succeed on a retry are retried (network drops,
// timeouts, HTTP 408/429/5xx). A JSON-RPC error body or a client-error
// status is terminal: retrying it can never help.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function terminal(err) {
  err.terminal = true;
  return err;
}

export async function rpcCall(url, method, params = [], timeoutMs = 6000, attempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        if (!(res.status === 408 || res.status === 429 || res.status >= 500)) throw terminal(err);
        throw err;
      }
      const body = await res.json();
      if (body.error) throw terminal(new Error(`${method}: ${String(body.error.message || 'rpc error')}`));
      return body.result;
    } catch (e) {
      if (e.terminal) throw e;
      const isTimeout = e.name === 'AbortError';
      const cause = e.cause ? ` (${e.cause.code || e.cause.message || 'network'})` : '';
      lastErr = new Error(isTimeout ? `timeout after ${timeoutMs}ms` : `${e.message}${cause}`);
      if (attempt < attempts) await sleep(400 * attempt);
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

// Parse an RPC quantity. Returns null — never NaN — for anything that is
// not a well-formed 0x-hex string or a finite number, so a malformed field
// degrades to "no data" downstream instead of poisoning the metric math
// (NaN comparisons are always false and would slip past every guard).
// BigInt parsing avoids float precision loss on large wei values.
export const hexToInt = (h) => {
  if (typeof h === 'number') return Number.isFinite(h) ? h : null;
  if (typeof h !== 'string' || !/^0x[0-9a-fA-F]+$/.test(h)) return null;
  return Number(BigInt(h));
};
