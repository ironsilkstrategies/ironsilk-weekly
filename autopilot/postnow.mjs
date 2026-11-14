/* v3.1.4 · a one-off social post on request (its own workflow, so the worker's queue can't bump it). Usage: node postnow.mjs welcome */
import { postNow } from './worker.mjs';
const kind = (process.argv[2] || '').trim();
const m = await postNow(kind);
if (!m) { console.log('[postnow] nothing posted (unknown kind, or no social outlet is on)'); process.exit(0); }
process.exit(Object.values(m).includes(true) ? 0 : 1);
