import { assert } from '../src/domain.ts';
import type { Network } from '../src/domain.ts';
import { address, normalizeTransaction, SUI } from './activity.ts';

export const FIXTURE_WALLET = address('0xa');
export const FIXTURE_OTHER = address('0xb');
export const FIXTURE_DIGESTS = [
  '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
  '8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR',
  'CktRuQ2mttgRGkXJtyksdKHjUdc2C4TgDzyB98oEzy8',
];
export function fixtureTransaction(index = 0): any {
  const amount = (10n + BigInt(index)) * 1_000_000_000n;
  return {
    digest: FIXTURE_DIGESTS[index], checkpoint: String(100 + index),
    timestamp: { seconds: '1793836800', nanos: index },
    transaction: { digest: FIXTURE_DIGESTS[index], sender: FIXTURE_WALLET,
      gasPayment: { owner: FIXTURE_WALLET, objects: [], price: '1000', budget: '10000000' },
      kind: { data: { oneofKind: 'programmableTransaction',
        programmableTransaction: { inputs: [], commands: [
          { command: { oneofKind: 'transferObjects', transferObjects: { objects: [] } } },
        ] } } } },
    effects: { status: { success: true }, transactionDigest: FIXTURE_DIGESTS[index],
      gasUsed: { computationCost: '1000', storageCost: '100', storageRebate: '50', nonRefundableStorageFee: '0' } },
    balanceChanges: [
      { address: FIXTURE_WALLET, coinType: SUI, amount: (-amount - 1050n).toString() },
      { address: FIXTURE_OTHER, coinType: SUI, amount: amount.toString() },
    ],
  };
}
export class FixtureActivityData {
  network: Network;
  constructor(network: Network) { this.network = network; }
  async transactions(ids: string[]) {
    return ids.map(id => {
      const index = FIXTURE_DIGESTS.indexOf(id);
      assert(index >= 0, 'FIXTURE_TRANSACTION_NOT_FOUND');
      return normalizeTransaction(fixtureTransaction(index), id, this.network, 'fixture');
    });
  }
}
