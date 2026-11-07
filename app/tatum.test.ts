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

test('raw transaction observation preserves provider evidence and stops without retry if archival fails', async () => {
  const { fixtureTransaction, FIXTURE_DIGESTS } = await import('./activity-fixtures.ts');
  const raw = fixtureTransaction(0); let attempts = 0, observed: any;
  const client = { ledgerService: { batchGetTransactions: async () => { attempts++; return { response: { transactions: [{ result: { oneofKind: 'transaction', transaction: raw } }] } }; } } };
  const data = new TatumData(client, 'mainnet', () => {}, (digests, response) => { observed = { digests, response }; });
  const [tx] = await data.transactions([FIXTURE_DIGESTS[0]]);
  assert.deepEqual(observed.digests, [FIXTURE_DIGESTS[0]]);
  assert.equal(observed.response.transactions[0].result.transaction.transaction.gasPayment.owner, tx.gas.payer);
  const used = raw.effects.gasUsed;
  assert.equal((BigInt(used.computationCost) + BigInt(used.storageCost) - BigInt(used.storageRebate)).toString(), tx.gas.netCharge);
  assert.equal(tx.source, 'tatum'); assert.equal(attempts, 1); data.close();
  const stopped = new TatumData(client, 'mainnet', () => {}, () => { throw Error('SYNTHETIC_ARCHIVE_FAILED'); });
  await assert.rejects(stopped.transactions([FIXTURE_DIGESTS[0]]), /SYNTHETIC_ARCHIVE_FAILED/);
  assert.equal(attempts, 2); stopped.close();
});
