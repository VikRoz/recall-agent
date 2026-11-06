import assert from 'node:assert/strict';
export function requireAvailableModel(catalog, selected) {
  assert(Array.isArray(catalog?.data) && catalog.data.length > 0, 'MODEL_CATALOG_REQUIRED');
  assert(typeof selected === 'string' && catalog.data.some(m => m.model === selected || m.id === selected), 'MODEL_NOT_AVAILABLE');
  return selected;
}
