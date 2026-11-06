import { assert } from './domain.ts';
export type Inventory = { blobIds: string[]; revision: string };
export type Hit = { blobId: string; text: string };
type MemoryReader = { inventory(): Promise<Inventory>; recall(query: string, limit: number): Promise<Hit[]> };
const MAX_CORPUS = 20;
// A semantic top-k result alone cannot establish complete correction history.
export async function readCompleteMemory(port: MemoryReader,
  expectedBlobIds: string[] = [], query = 'service experience verification'): Promise<Hit[]> {
  const before = await port.inventory();
  assert(expectedBlobIds.every(id => before.blobIds.includes(id)), 'MEMORY_EXPECTED_RECORD_MISSING');
  assert(before.blobIds.length <= MAX_CORPUS, 'MEMORY_CORPUS_LIMIT');
  assert(new Set(before.blobIds).size === before.blobIds.length, 'MEMORY_DUPLICATE_BLOB');
  const hits = before.blobIds.length ? await port.recall(query, MAX_CORPUS) : [];
  const after = await port.inventory();
  assert(before.revision === after.revision && [...before.blobIds].sort().join('|') === [...after.blobIds].sort().join('|'), 'MEMORY_CHANGED_DURING_READ');
  assert(hits.length === before.blobIds.length && new Set(hits.map(x => x.blobId)).size === hits.length
    && hits.every(x => before.blobIds.includes(x.blobId)), 'MEMORY_CONTEXT_INCOMPLETE');
  for (const hit of hits) assert(new TextEncoder().encode(hit.text).length <= 4096, 'MEMORY_RECORD_TOO_LARGE');
  return hits;
}
