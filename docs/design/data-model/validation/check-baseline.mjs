import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const baseline = JSON.parse(readFileSync(new URL('requirements-baseline.json', import.meta.url), 'utf8'));
for (const [file, digest] of Object.entries(baseline.files)) {
  assert.equal(createHash('sha256').update(readFileSync(root + file)).digest('hex'), digest, file);
}
console.log(`PASS: ${Object.keys(baseline.files).length} requirement sources unchanged`);
