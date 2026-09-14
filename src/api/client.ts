/**
 * Single seam between the UI and the backend.
 *
 * Every API function declares the FSD route it will call and a mock
 * implementation. Switching `VITE_API_MODE` to `real` routes the identical
 * call signature to the FastAPI backend; no component changes are needed.
 */
import { config, isMock } from '@/services/config';
import { http, type RequestOptions } from '@/services/http';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function call<T>(
  path: string,
  mock: () => T,
  options: RequestOptions = {},
): Promise<T> {
  if (isMock()) {
    await wait(config.mockLatencyMs);
    return mock();
  }
  return http<T>(path, options);
}
