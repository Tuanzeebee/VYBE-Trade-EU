import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@/lib/api/client';

function fakeFetch(body: unknown) {
  return vi.fn<(req: Request) => Promise<Response>>(async () =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
  );
}

describe('apiClient', () => {
  it('gọi đúng URL theo baseUrl và trả body', async () => {
    const fetchMock = fakeFetch({ db: 'ok', storage: 'ok' });
    const api = createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock });
    const { data, response } = await api.GET('/health');
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0].url).toBe('http://api.test/health');
    expect(data).toEqual({ db: 'ok', storage: 'ok' });
  });

  it('gửi kèm cookie phiên (credentials: include)', async () => {
    const fetchMock = fakeFetch({});
    const api = createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock });
    await api.GET('/health');
    expect(fetchMock.mock.calls[0][0].credentials).toBe('include');
  });

  it('kiểu đường dẫn sinh từ OpenAPI: đường dẫn lạ không biên dịch', () => {
    const api = createApiClient({ baseUrl: 'http://api.test', fetch: fakeFetch({}) });
    // Chỉ kiểm ở bước typecheck; hàm không được gọi.
    const unknownPath = () =>
      // @ts-expect-error — '/khong-ton-tai' không có trong schema backend
      api.GET('/khong-ton-tai');
    expect(unknownPath).toBeTypeOf('function');
  });
});
