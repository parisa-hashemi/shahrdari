/**
 * HTTP client for the real backend (FSD-C01).
 *
 * Response envelope: `{ data, meta: { request_id, revision } }`.
 * Credentials are attached by the browser session; tokens are never written
 * into URLs, logs or component state.
 */
import { config } from './config';

export class ApiError extends Error {
  status: number;
  code: string;
  /** Persian, user-facing, actionable */
  userMessage: string;

  constructor(status: number, code: string, userMessage: string) {
    super(`${status} ${code}`);
    this.status = status;
    this.code = code;
    this.userMessage = userMessage;
  }
}

const FRIENDLY: Record<number, string> = {
  400: 'درخواست معتبر نیست. مقادیر واردشده را بررسی کنید.',
  401: 'نشست شما معتبر نیست. لطفاً دوباره وارد شوید.',
  403: 'شما مجوز انجام این عملیات را ندارید.',
  404: 'مورد درخواست‌شده یافت نشد یا در دامنه دسترسی شما نیست.',
  409: 'وضعیت این مورد تغییر کرده است. صفحه را تازه کنید و دوباره تلاش کنید.',
  410: 'این نتیجه منقضی شده است؛ فهرست را دوباره بارگذاری کنید.',
  422: 'اعتبارسنجی ناموفق بود. پیام‌های کنار فیلدها را بررسی کنید.',
  500: 'اجرای درخواست با مشکل مواجه شد. در صورت تکرار با پشتیبانی تماس بگیرید.',
  503: 'سرویس موردنیاز در حال حاضر در دسترس نیست.',
};

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (!response.ok) {
    let code = 'UNKNOWN';
    try {
      const payload = await response.json();
      code = payload?.error?.code ?? code;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(
      response.status,
      code,
      FRIENDLY[response.status] ?? 'خطای پیش‌بینی‌نشده رخ داد.',
    );
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}
