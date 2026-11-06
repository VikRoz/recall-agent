import { randomUUID } from 'node:crypto';
import { normalizeStructTag, isValidStructTag, isValidTransactionDigest } from '@mysten/sui/utils';
import { assert, exactKeys, object, time } from '../src/domain.ts';
import type { Network } from '../src/domain.ts';

export const MAX_TRANSACTIONS = 10;
export const SUI = normalizeStructTag('0x2::sui::SUI');
export type Movement = { address: string; coinType: string; amount: string };
export type ActivityTransaction = {
  digest: string; network: Network; checkpoint: string; timestamp: string;
  sender: string; commands: string[]; interpretation: 'unparsed-ptb' | 'transfer-commands'; status: 'success' | 'failed'; source: 'tatum' | 'fixture';
  gas: { payer: string; computation: string; storage: string; rebate: string; netCharge: string };
  movements: Movement[];
};
export type Rule = {
  schema: 1; kind: 'address-rule'; id: string; owner: string; project: string;
  network: Network; subjectWallet: string; address: string; relation: 'self' | 'external' | 'unknown';
  label: string; recordedAt: string; effectiveFrom: string; supersedes: string | null;
  source: 'user-confirmed';
};
export type StoredRule = { record: Rule; blobId: string };
export type Binding = { owner: string; project: string };

export function address(value: unknown): string {
  assert(typeof value === 'string' && /^0x[0-9a-fA-F]{1,64}$/.test(value), 'INVALID_ADDRESS');
  return '0x' + value.slice(2).toLowerCase().padStart(64, '0');
}
export function digest(value: unknown): string {
  assert(typeof value === 'string' && isValidTransactionDigest(value), 'INVALID_TRANSACTION_DIGEST');
  return value;
}
export function transactionId(value: string, network?: Network): string {
  if (!value.startsWith('https://')) return digest(value);
  const url = new URL(value);
  assert(['suiscan.xyz', 'suivision.xyz'].includes(url.hostname) && !url.port
    && !url.username && !url.password && !url.search && !url.hash, 'UNSUPPORTED_EXPLORER_LINK');
  const match = url.pathname.match(/^(?:\/(mainnet|testnet))?\/(?:tx|txblock)\/([1-9A-HJ-NP-Za-km-z]+)\/?$/);
  assert(match, 'UNSUPPORTED_EXPLORER_LINK');
  assert(!network || (match[1] ?? 'mainnet') === network, 'EXPLORER_NETWORK_MISMATCH');
  return digest(match[2]);
}
export function signed(value: unknown): bigint {
  assert(typeof value === 'string' && /^(0|-?[1-9][0-9]{0,39})$/.test(value), 'INVALID_AMOUNT');
  return BigInt(value);
}
function unsigned(value: unknown): string {
  const result = typeof value === 'bigint' ? value.toString() : value;
  assert(typeof result === 'string' && /^(0|[1-9][0-9]{0,29})$/.test(result), 'INVALID_CHAIN_INTEGER');
  return result;
}
export function normalizeTransaction(raw: unknown, requested: string, network: Network,
  source: 'tatum' | 'fixture' = 'tatum'): ActivityTransaction {
  const tx = object(raw);
  assert(tx.digest === digest(requested) && (!tx.transaction?.digest || tx.transaction.digest === requested)
    && (!tx.effects?.transactionDigest || tx.effects.transactionDigest === requested), 'TRANSACTION_MISMATCH');
  const success = tx.effects?.status?.success;
  assert(typeof success === 'boolean', 'TRANSACTION_STATUS_MISSING');
  const seconds = unsigned(tx.timestamp?.seconds);
  const nanos = tx.timestamp?.nanos ?? 0;
  assert(Number.isInteger(nanos) && nanos >= 0 && nanos < 1_000_000_000, 'INVALID_CHAIN_TIME');
  const millis = BigInt(seconds) * 1000n + BigInt(Math.floor(nanos / 1_000_000));
  assert(millis <= 8640000000000000n, 'INVALID_CHAIN_TIME');
  const timestamp = new Date(Number(millis)).toISOString();
  const gas = tx.effects?.gasUsed;
  assert(gas && tx.transaction?.gasPayment?.owner, 'GAS_EVIDENCE_MISSING');
  const computation = unsigned(gas.computationCost);
  const storage = unsigned(gas.storageCost);
  const rebate = unsigned(gas.storageRebate);
  assert(Array.isArray(tx.balanceChanges) && tx.balanceChanges.length <= 200, 'BALANCE_CHANGES_MISSING');
  assert(tx.balanceChanges.length > 0 || BigInt(computation) + BigInt(storage) - BigInt(rebate) === 0n,
    'INCOMPLETE_BALANCE_CHANGES');
  const combined = new Map<string, Movement>();
  for (const item of tx.balanceChanges) {
    const account = address(item.address);
    assert(typeof item.coinType === 'string' && item.coinType.length <= 300
      && isValidStructTag(item.coinType), 'INVALID_COIN_TYPE');
    let coin: string;
    try { coin = normalizeStructTag(item.coinType); } catch { throw Error('INVALID_COIN_TYPE'); }
    const key = account + '/' + coin;
    const amount = signed(item.amount) + BigInt(combined.get(key)?.amount ?? '0');
    combined.set(key, { address: account, coinType: coin, amount: amount.toString() });
  }
  const kind = tx.transaction?.kind?.data;
  assert(kind?.oneofKind === 'programmableTransaction', 'UNSUPPORTED_SYSTEM_TRANSACTION');
  const commands = kind.programmableTransaction?.commands;
  assert(Array.isArray(commands) && commands.length <= 100, 'COMMANDS_MISSING');
  const commandNames = commands.map((c: any) => c.command?.oneofKind ?? 'unknown');
  const transferCommands = commandNames.length > 0
    && commandNames.every((name: string) => ['splitCoins', 'mergeCoins', 'transferObjects'].includes(name));
  return {
    digest: requested, network, checkpoint: unsigned(tx.checkpoint), timestamp,
    sender: address(tx.transaction?.sender), commands: commandNames,
    interpretation: transferCommands ? 'transfer-commands' : 'unparsed-ptb', status: success ? 'success' : 'failed', source,
    gas: { payer: address(tx.transaction.gasPayment.owner), computation, storage, rebate,
      netCharge: (BigInt(computation) + BigInt(storage) - BigInt(rebate)).toString() },
    movements: [...combined.values()].sort((a, b) => (a.address + a.coinType).localeCompare(b.address + b.coinType)),
  };
}
export function rule(raw: unknown, binding: Binding): Rule {
  const r = object(raw);
  exactKeys(r, ['schema', 'kind', 'id', 'owner', 'project', 'network', 'subjectWallet', 'address',
    'relation', 'label', 'recordedAt', 'effectiveFrom', 'supersedes', 'source']);
  assert(r.schema === 1 && r.kind === 'address-rule' && /^rule:[a-f0-9-]{36}$/.test(r.id), 'INVALID_RULE');
  assert(r.owner === address(binding.owner) && r.project === binding.project
    && /^[a-zA-Z0-9_-]{1,64}$/.test(r.project), 'RULE_BINDING_MISMATCH');
  assert(r.network === 'mainnet' || r.network === 'testnet', 'RULE_NETWORK');
  assert(r.address === address(r.address) && r.subjectWallet === address(r.subjectWallet)
    && r.address !== r.subjectWallet, 'RULE_ADDRESS');
  assert(['self', 'external', 'unknown'].includes(r.relation) && r.source === 'user-confirmed', 'RULE_PROVENANCE');
  assert(typeof r.label === 'string' && r.label.length <= 100 && !/[\u0000-\u001f\u007f]/.test(r.label), 'RULE_LABEL');
  time(r.recordedAt);
  assert(time(r.effectiveFrom) <= time(r.recordedAt), 'RULE_FUTURE_EFFECTIVE_DATE');
  assert(r.supersedes === null || /^rule:[a-f0-9-]{36}$/.test(r.supersedes), 'RULE_PARENT');
  return r as Rule;
}
export function ruleScope(r: Rule): string {
  return [r.owner, r.project, r.network, r.subjectWallet, r.address].join('/');
}
export function validateRules(rows: StoredRule[], binding: Binding): StoredRule[] {
  const checked = rows.map(row => ({ blobId: row.blobId, record: rule(row.record, binding) }));
  const records = checked.map(row => row.record);
  assert(new Set(records.map(r => r.id)).size === records.length, 'DUPLICATE_RULE');
  for (const r of records) {
    const same = records.filter(p => ruleScope(p) === ruleScope(r));
    if (r.supersedes !== null) {
      const parent = same.find(p => p.id === r.supersedes);
      assert(parent && time(parent.recordedAt) < time(r.recordedAt), 'INVALID_RULE_CHAIN');
      assert(records.filter(p => p.supersedes === r.supersedes).length === 1, 'RULE_FORK');
    } else {
      assert(same.filter(p => p.supersedes === null).length === 1, 'DUPLICATE_RULE_ROOT');
    }
  }
  return checked;
}
export function applicableRule(rows: StoredRule[], network: Network, wallet: string, account: string,
  at: string, transactionAt = at): StoredRule | undefined {
  const visible = rows.filter(({ record: r }) => r.network === network && r.subjectWallet === wallet
    && r.address === account && time(r.recordedAt) <= time(at) && time(r.effectiveFrom) <= time(transactionAt));
  const parents = new Set(visible.map(({ record: r }) => r.supersedes));
  const heads = visible.filter(({ record: r }) => !parents.has(r.id));
  assert(heads.length <= 1, 'RULE_CONFLICT');
  return heads[0];
}
export function newRule(binding: Binding, network: Network, wallet: string, account: string,
  relation: Rule['relation'], label: string, now: string, effectiveFrom: string, parent: string | null): Rule {
  return rule({ schema: 1, kind: 'address-rule', id: 'rule:' + randomUUID(),
    owner: address(binding.owner), project: binding.project, network, subjectWallet: address(wallet),
    address: address(account), relation, label, recordedAt: now, effectiveFrom,
    supersedes: parent, source: 'user-confirmed' }, binding);
}
export function report(transactions: ActivityTransaction[], wallet: string, rules: StoredRule[], at: string) {
  const rows = transactions.flatMap(tx => tx.movements.map(movement => {
    const matched = applicableRule(rules, tx.network, wallet, movement.address, at, tx.timestamp);
    return { digest: tx.digest, network: tx.network, timestamp: tx.timestamp, status: tx.status,
      source: tx.source, address: movement.address, coinType: movement.coinType,
      netAmountBaseUnits: movement.amount,
      relation: movement.address === wallet ? 'subject-wallet' : matched?.record.relation ?? 'unclassified',
      label: matched?.record.label ?? '', ruleId: matched?.record.id ?? null,
      memoryBlobId: matched?.blobId ?? null };
  }));
  const sums = new Map<string, bigint>();
  const group = new Map<string, bigint>();
  for (const row of rows.filter(row => row.relation === 'subject-wallet' || row.relation === 'self')) {
    group.set(row.coinType, (group.get(row.coinType) ?? 0n) + BigInt(row.netAmountBaseUnits));
  }
  for (const row of rows.filter(row => row.address === wallet)) {
    sums.set(row.coinType, (sums.get(row.coinType) ?? 0n) + BigInt(row.netAmountBaseUnits));
  }
  return { wallet, asOf: at, digests: transactions.map(tx => tx.digest), rows,
    totals: [...sums].map(([coinType, amount]) => ({ coinType, netAmountBaseUnits: amount.toString() })),
    declaredWalletTotals: [...group].map(([coinType, amount]) => ({ coinType, netAmountBaseUnits: amount.toString() })),
    gas: transactions.map(tx => ({ digest: tx.digest, ...tx.gas })),
    notes: ['Totals cover the supplied digests only.', 'Net balance changes include their onchain effects.',
      'Gas information is displayed separately and is not subtracted again.',
      'Declared wallet totals use the address relations confirmed by the user.',
      'Address relations are user-confirmed context. They do not identify a direct transfer counterparty.'] };
}
function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+@-]/.test(text) && !/^-?(0|[1-9][0-9]*)$/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function csv(value: ReturnType<typeof report>): string {
  const columns = ['digest', 'network', 'timestamp', 'status', 'source', 'address', 'coinType',
    'netAmountBaseUnits', 'relation', 'label', 'ruleId', 'memoryBlobId'] as const;
  return [columns.join(','), ...value.rows.map(row => columns.map(key => csvCell(row[key])).join(','))].join('\r\n') + '\r\n';
}
