import assert from 'node:assert/strict';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemWal } from '@mysten-incubation/memwal';
const relay = 'https://relayer.memory.walrus.xyz';
const address = /^0x[a-f0-9]{64}$/;

function privateJson(path) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = fstatSync(fd);
    assert(info.isFile() && info.uid === process.getuid() && (info.mode & 0o077) === 0 && info.size < 8192, 'PROFILE_ACCESS');
    return JSON.parse(readFileSync(fd, 'utf8'));
  } finally { closeSync(fd); }
}

export function profile(run) {
  const dir = join(run, 'profile');
  const info = lstatSync(dir);
  assert(info.isDirectory() && info.uid === process.getuid() && (info.mode & 0o077) === 0, 'PROFILE_DIR');
  const p = privateJson(join(dir, 'credentials.json'));
  assert(p.version === 1 && p.relayerUrl === relay && p.label === 'Recall Lab isolated check'
    && [p.accountId, p.walletAddress, p.packageId, p.delegateAddress].every(x => address.test(x))
    && p.delegateAddress !== p.walletAddress && /^[a-f0-9]{64}$/.test(p.delegatePrivateKey)
    && /^[a-f0-9]{64}$/.test(p.delegatePublicKeyHex), 'PROFILE_BINDING');
  return p;
}

export async function connect(run, namespace) {
  const p = profile(run);
  const sdk = MemWal.create({ key: p.delegatePrivateKey, accountId: p.accountId, serverUrl: relay, namespace,
    requestTimeoutMs: 15000, recallTimeoutMs: 45000, preflightTimeoutMs: 8000 });
  p.delegatePrivateKey = '';
  assert(await sdk.getPublicKeyHex() === p.delegatePublicKeyHex, 'PROFILE_KEY_MISMATCH');
  return { sdk, p };
}
