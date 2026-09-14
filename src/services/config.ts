/** Environment configuration. Never contains secrets or tokens. */
export type ApiMode = 'mock' | 'real';

export const config = {
  apiMode: (import.meta.env.VITE_API_MODE as ApiMode) ?? 'mock',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string) ?? '/api/v1',
  mockLatencyMs: Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 280),
  demoMode: (import.meta.env.VITE_DEMO_MODE ?? 'true') !== 'false',
  defaultLocale: (import.meta.env.VITE_DEFAULT_LOCALE as 'fa' | 'en') ?? 'fa',
};

export const isMock = () => config.apiMode === 'mock';
