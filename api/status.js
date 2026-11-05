import { sampleOnce } from './_state.js';

export default async function handler(req, res) {
  const poller = await sampleOnce();
  res.setHeader('cache-control', 'no-store');
  res.status(200).json(poller.status());
}
