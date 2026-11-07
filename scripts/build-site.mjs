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
const evidence='own-account-completion-live-2026-11-07';
mkdirSync(resolve(out,'evidence',evidence),{recursive:true});
// English presentation plus public facts/receipts. Original native-language transcripts
// remain unchanged in source evidence; do not relabel a translation as observed output.
for(const name of ['run.json','exports','submission-proofs','tatum-proofs'])
  cpSync(resolve(root,'evidence',evidence,name),resolve(out,'evidence',evidence,name),{recursive:true});
writeFileSync(resolve(out,'.nojekyll'),'');
console.log(out);
