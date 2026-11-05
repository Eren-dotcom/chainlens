import { respond } from './_state.js';
import { summarize } from '../src/metrics.js';

export default (req, res) => respond(res, (p) => ({ ...p.status(), stats: summarize(p.history) }));
