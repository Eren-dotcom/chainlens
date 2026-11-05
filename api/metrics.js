import { respond } from './_state.js';
import { shapeMetrics } from '../src/metrics.js';

export default (req, res) => respond(res, (p) => shapeMetrics(p.latest));
