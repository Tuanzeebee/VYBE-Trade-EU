import createClient, { type ClientOptions } from 'openapi-fetch';
import type { paths } from './schema';

export type ApiPaths = paths;

export function createApiClient(options: Omit<ClientOptions, 'credentials'> = {}) {
  return createClient<paths>({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
    ...options,
    // Phiên là cookie HTTP-only (ADR-0002) — luôn gửi kèm.
    credentials: 'include',
  });
}

export const apiClient = createApiClient();
