import { randomUUID } from 'node:crypto';
import { lstatSync, writeFileSync, readdirSync, openSync, closeSync, fstatSync, readFileSync, constants } from 'node:fs';
import { join } from 'node:path';
export const startupCode = error => [error?.message, error?.code]
  .find(v => typeof v === 'string' && /^[A-Z0-9_]{3,60}$/.test(v)) ?? 'ACTIVITY_STOPPED';
export function saveStartupFailure(run, error) {
  try {
    const info = lstatSync(run);
    if (!info.isDirectory() || info.uid !== process.getuid() || (info.mode & 0o077)) return;
    writeFileSync(join(run, 'activity-start-' + randomUUID() + '.json'),
      JSON.stringify({ code: startupCode(error), at: new Date().toISOString() }), { mode: 0o600, flag: 'wx' });
  } catch { /* Preserve the original startup failure if local diagnostic storage is unavailable. */ }
}
export function latestStartupCode(run, after) {
  try {
    let latest;
    for (const name of readdirSync(run).filter(n => /^activity-start-[a-f0-9-]{36}\.json$/.test(n)).sort().reverse()) {
      const fd = openSync(join(run, name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const info = fstatSync(fd);
        if (!info.isFile() || info.uid !== process.getuid() || (info.mode & 0o077) || info.size > 1024) continue;
        const value = JSON.parse(readFileSync(fd, 'utf8'));
        const at = Date.parse(value.at);
        if (at >= after && (!latest || at > latest.at) && /^[A-Z0-9_]{3,60}$/.test(value.code)) latest = { at, code: value.code };
      } finally { closeSync(fd); }
    }
    return latest?.code;
  } catch { /* The normal client exit code still stops the launcher. */ }
}
