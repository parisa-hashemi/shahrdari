/**
 * Verifies the local Jalali conversion against the platform's own calendar
 * implementation (Intl, `persian` calendar) across a long date range.
 *
 * Run with: npm run check:dates
 */
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'tuip-'));
const outfile = join(dir, 'jalali.mjs');
await build({ entryPoints: ['src/utils/jalali.ts'], outfile, format: 'esm', logLevel: 'silent' });
const { toJalali } = await import(outfile);

const reference = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

let checked = 0;
let failed = 0;
const start = Date.UTC(2015, 0, 1);
const end = Date.UTC(2035, 0, 1);

for (let t = start; t < end; t += 86_400_000) {
  const utc = new Date(t);
  // toJalali reads local calendar fields, so feed it the same civil date
  const local = new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  const { jy, jm, jd } = toJalali(local);
  const got = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;

  const parts = Object.fromEntries(
    reference.formatToParts(utc).map((part) => [part.type, part.value]),
  );
  const expected = `${parts.year.replace(/\D/g, '')}/${parts.month}/${parts.day}`;

  checked += 1;
  if (got !== expected) {
    failed += 1;
    if (failed <= 5) console.error(`mismatch ${utc.toISOString().slice(0, 10)}: got ${got}, expected ${expected}`);
  }
}

console.log(`${checked} روز بررسی شد — ${failed === 0 ? 'بدون اختلاف' : `${failed} اختلاف`}`);
process.exit(failed === 0 ? 0 : 1);
