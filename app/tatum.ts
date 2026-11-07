import { MAX_TRANSACTIONS, digest, normalizeTransaction } from './activity.ts';
import { assert, Fault } from '../src/domain.ts';
import type { Network } from '../src/domain.ts';
import { factHash, NORMALIZER_SHA256 } from './agent-facts.ts';
import type { FactEvidence } from './agent-facts.ts';

export const ENDPOINTS = {
  mainnet: 'https://sui-mainnet-grpc.gateway.tatum.io',
  testnet: 'https://sui-testnet-grpc.gateway.tatum.io',
} as const;
export class TatumData {
  evidence = new Map<string, FactEvidence>();
  factEvidence(id: string) { const value = this.evidence.get(id); assert(value, 'FACT_PROVENANCE_MISSING'); return structuredClone(value); }
  client: any; network: Network; dispose: () => void; closed = false;
  observeResponse: ((digests: string[], response: any) => void) | undefined;
  deadline: number | undefined;
  constructor(client: any, network: Network, dispose: () => void = () => {}, observeResponse?: (digests: string[], response: any) => void, deadline?: number) {
    this.client = client; this.network = network; this.dispose = dispose; this.observeResponse = observeResponse; this.deadline=deadline;
  }
  close() { if (!this.closed) { this.closed = true; this.dispose(); } }
  async transactions(digests: string[]) {
    assert(!this.closed && Array.isArray(digests) && digests.length > 0
      && digests.length <= MAX_TRANSACTIONS, 'TRANSACTION_LIST_LIMIT');
    digests.forEach(digest);
    assert(new Set(digests).size === digests.length, 'DUPLICATE_TRANSACTION');
    const timeout=Math.min(10000,this.deadline===undefined?10000:this.deadline-Date.now());assert(timeout>0,'TATUM_DEADLINE_EXPIRED');
    const call = await this.client.ledgerService.batchGetTransactions({
      digests,
      readMask: { paths: ['digest', 'checkpoint', 'timestamp', 'transaction.sender',
        'transaction.digest', 'transaction.kind', 'transaction.gas_payment', 'effects.status',
        'effects.transaction_digest', 'effects.gas_used', 'balance_changes'] },
    }, { abort: AbortSignal.timeout(timeout), timeout });
    this.observeResponse?.(digests, call.response);
    const values = call.response?.transactions;
    assert(Array.isArray(values) && values.length === digests.length, 'TRANSACTION_BATCH_INCOMPLETE');
    const normalized = values.map((value: any) => {
      assert(value.result?.oneofKind === 'transaction', 'TRANSACTION_UNAVAILABLE');
      const tx = value.result.transaction;
      assert(digests.includes(tx?.digest), 'UNEXPECTED_TRANSACTION');
      return normalizeTransaction(tx, tx.digest, this.network);
    });
    assert(new Set(normalized.map(tx => tx.digest)).size === digests.length, 'TRANSACTION_BATCH_DUPLICATE');
    for (const value of values) {
      const raw = value.result.transaction;
      this.evidence.set(raw.digest, {kind:'tatum',method:'sui.rpc.v2.LedgerService/BatchGetTransactions',
        hashScope:'protobuf-json-selected-transaction',rawTransactionSha256:factHash(raw),normalizerSha256:NORMALIZER_SHA256});
    }
    return digests.map(id => normalized.find(tx => tx.digest === id)!);
  }

}
export async function connectTatum(env: Record<string, string | undefined>, network: Network = 'mainnet', observeResponse?: (digests: string[], response: any) => void, deadline?: number) {
  assert(env.TATUM_API_KEY, 'TATUM_CREDENTIALS_MISSING');
  const packageName = '@mysten/sui/grpc';
  let sdk: any;
  try { sdk = await import(packageName); } catch { throw new Fault('SUI_SDK_NOT_INSTALLED'); }
  const transportPackage = '@protobuf-ts/grpc-transport', grpcPackage = '@grpc/grpc-js';
  let transports: any, grpc: any;
  try { [transports, grpc] = await Promise.all([import(transportPackage), import(grpcPackage)]); }
  catch { throw new Fault('SUI_NATIVE_TRANSPORT_NOT_INSTALLED'); }
  const host = new URL(ENDPOINTS[network]).hostname + ':443';
  const channelCredentials = grpc.ChannelCredentials.createSsl();
  // Own the channel explicitly so every caller can release its HTTP/2 resources.
  const owner = new grpc.Client(host, channelCredentials, {
    'grpc.enable_retries': 0,
    'grpc.max_send_message_length': 65536,
    'grpc.max_receive_message_length': 1048576,
  });
  try {
    const transport = new transports.GrpcTransport({
      host, channelCredentials, clientOptions: { channelOverride: owner.getChannel() },
      meta: { 'x-api-key': env.TATUM_API_KEY }, timeout: 10000,
    });
    const client = new sdk.SuiGrpcClient({ network, transport });
    return new TatumData(client, network, () => owner.close(), observeResponse, deadline);
  } catch (error) { owner.close(); throw error; }
}
