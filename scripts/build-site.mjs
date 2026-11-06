import { mkdirSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
assert(process.argv[2], 'Supply an empty output directory outside the source tree.');
const out = resolve(process.argv[2]);
assert(!out.startsWith(root) && !existsSync(out), 'Output must be a new directory outside the source tree.');
mkdirSync(out, {recursive:true});
cpSync(resolve(root,'web'),out,{recursive:true});
for (const name of ['activity-model-2026-11-05','activity-mainnet-2026-11-05']) {
  mkdirSync(resolve(out,'evidence'),{recursive:true});
  cpSync(resolve(root,'evidence',name),resolve(out,'evidence',name),{recursive:true});
}
writeFileSync(resolve(out,'.nojekyll'),'');
console.log(out);
