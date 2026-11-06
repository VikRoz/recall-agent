import test from 'node:test';
import assert from 'node:assert/strict';
import { TatumData, ENDPOINTS, connectTatum } from './tatum.ts';

test('Tatum channel cleanup runs only once', () => {
  let closed = 0;
  const data = new TatumData({}, 'testnet', () => { closed++; });
  data.close(); data.close();
  assert.equal(closed, 1);
});
test('installed native transport constructs the Tatum client without a network call', async (t) => {
  for (const packageName of ['@mysten/sui/grpc', '@protobuf-ts/grpc-transport', '@grpc/grpc-js']) {
    try { await import(packageName); }
    catch (error: any) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      t.skip('Native SDK dependencies are absent in the offline workspace');
      return;
    }
  }
  const data = await connectTatum({ TATUM_API_KEY: 'public-test-sentinel' }, 'testnet');
  try {
    assert.equal(data.network, 'testnet');
    assert.equal(typeof data.client.ledgerService.batchGetTransactions, 'function');
  } finally { data.close(); }
});
