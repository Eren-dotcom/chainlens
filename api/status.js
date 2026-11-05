import { respond } from './_state.js';

export default (req, res) => respond(res, (p) => p.status());
