import { jalaliMonthNames, toJalali } from './jalali';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Convert Latin digits to Persian digits for display only. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Normalise Persian/Arabic digits to Latin digits, keeping everything else. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** Parse a string that may contain Persian/Arabic digits into a number. */
export function parseLocalizedNumber(input: string): number {
  const normalized = input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[،,\s]/g, '');
  return Number(normalized);
}

export interface NumberFormatOptions {
  /** decimal places; omitted means "as needed, up to 3" */
  precision?: number;
  /** render Persian digits (default true) */
  persianDigits?: boolean;
  /** thousands grouping (default true) */
  grouping?: boolean;
}

/**
 * Display formatting only. Canonical unrounded values stay in the model
 * (FSD B01.1: persist unrounded, round only for display).
 */
export function formatNumber(
  value: number | null | undefined,
  opts: NumberFormatOptions = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const { precision, persianDigits = true, grouping = true } = opts;
  const fixed =
    precision === undefined
      ? String(Math.round(value * 1000) / 1000)
      : value.toFixed(precision);
  const [intPart, decPart] = fixed.split('.');
  const grouped = grouping ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '٬') : intPart;
  const out = decPart ? `${grouped}٫${decPart}` : grouped;
  return persianDigits ? toPersianDigits(out) : out;
}

/** Ratio -> percent display, keeping the stored ratio distinct (B01.1). */
export function formatPercent(ratio: number | null, precision = 0): string {
  if (ratio === null) return '—';
  return `${formatNumber(ratio * 100, { precision })}٪`;
}

export function formatDelta(
  value: number | null,
  opts: NumberFormatOptions = {},
): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatNumber(Math.abs(value), opts)}`;
}

/** Jalali date display for a canonical ISO date/timestamp. */
export function formatJalaliDate(iso: string | undefined, withTime = false): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const { jy, jm, jd } = toJalali(date);
  const base = `${toPersianDigits(jy)}/${toPersianDigits(String(jm).padStart(2, '0'))}/${toPersianDigits(String(jd).padStart(2, '0'))}`;
  if (!withTime) return base;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${base} — ${toPersianDigits(hh)}:${toPersianDigits(mm)}`;
}

export function formatJalaliLong(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const { jy, jm, jd } = toJalali(date);
  return `${toPersianDigits(jd)} ${jalaliMonthNames[jm - 1]} ${toPersianDigits(jy)}`;
}

/** Relative time in Persian, for activity feeds. */
export function formatRelative(iso: string, now = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'هم‌اکنون';
  if (min < 60) return `${toPersianDigits(min)} دقیقه پیش`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${toPersianDigits(days)} روز پیش`;
  return formatJalaliDate(iso);
}

/** Shorten a hash/UUID for display without losing its LTR isolation. */
export function shortHash(hash: string, len = 10): string {
  return hash.length <= len ? hash : `${hash.slice(0, len)}…`;
}
