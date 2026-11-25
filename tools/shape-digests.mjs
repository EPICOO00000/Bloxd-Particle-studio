// Fingerprints of the shape library, heading by heading: tests/shape-digests.json.
//
// A saved scene names a shape and how many particles it has; the shape gives
// the points. So a shape must go on giving exactly the points it gave: this
// file notes, for every heading of every tab, how many shapes stand under it
// and one number worked out from all their points. The tests compare.
//
// Run with: node tools/shape-digests.mjs   after ADDING shapes on purpose.
// (When the tests say a heading has changed and nothing was added there, an
// existing shape gives other points than before: that breaks saved scenes.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHAPES, shapePoints, defaultParams } from '../js/shapes.js';

/** One number for a shape: its points with the usual number of particles and with 120, and with every slider at both ends. */
export function shapeDigest(shape) {
  let hash = 2166136261;
  const eat = (text) => {
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  };
  const points = (n, params) => {
    const pts = shapePoints(shape.id, n, params);
    eat(`${pts.length}:`);
    for (const p of pts) eat(`${p.map((v) => (Math.round(v * 1e6) / 1e6 || 0).toFixed(6)).join(',')};`);
  };
  eat(`${shape.id}|${shape.count}|${shape.min}|`);
  points(shape.count, defaultParams(shape.id));
  points(120, defaultParams(shape.id));
  for (const p of shape.params || []) for (const v of [p.min, p.max]) points(shape.count, { ...defaultParams(shape.id), [p.key]: v });
  return hash;
}

/** { 'tab/Heading': 'how many shapes, their fingerprint' } for the whole library. */
export function shapeDigests() {
  const groups = new Map();
  for (const shape of SHAPES) {
    const key = `${shape.cat}/${shape.sub || ''}`;
    const group = groups.get(key) || { size: 0, hash: 2166136261 };
    group.size++;
    group.hash = Math.imul(group.hash ^ shapeDigest(shape), 16777619) >>> 0;
    groups.set(key, group);
  }
  return Object.fromEntries([...groups].map(([key, { size, hash }]) => [key, `${size} ${hash.toString(16).padStart(8, '0')}`]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const digests = shapeDigests();
  fs.writeFileSync(path.join(here, '../tests/shape-digests.json'), `${JSON.stringify(digests, null, 1)}\n`);
  console.log(`Wrote tests/shape-digests.json: ${Object.keys(digests).length} headings, ${SHAPES.length} shapes.`);
}
