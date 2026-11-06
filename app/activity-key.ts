import { constants, openSync, closeSync, fstatSync, readFileSync } from 'node:fs';
import { assert } from '../src/domain.ts';

// Only the provider process reads this file. Never put its value in CLI args or model context.
export function readTatumKey(path: string, accountId: string): string {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = fstatSync(fd);
    assert(info.isFile() && info.uid === process.getuid() && (info.mode & 0o077) === 0
      && info.size > 0 && info.size <= 256, 'TATUM_KEY_FILE');
    const key = readFileSync(fd, 'utf8').trim();
    assert(/^[a-f0-9]{24}$/.test(accountId) && key.startsWith('t-' + accountId)
      && /^[A-Za-z0-9_-]{32,256}$/.test(key), 'TATUM_KEY_ACCOUNT');
    return key;
  } finally { closeSync(fd); }
}
