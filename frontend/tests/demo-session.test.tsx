import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDemoSession } from '@/components/app-shell/useDemoSession';

const ME = { id: 'u-1', email: 'seller@x.vn', role: 'exporter', preferred_language: 'vi' };

describe('useDemoSession — chuyển trang không chờ lại /api/me', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mount đầu chờ server; mount sau (chuyển trang) có phiên ngay, vẫn hỏi lại server ở nền', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(ME), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('vybe_profiles_v2', JSON.stringify({ 'u-1': { onboardingCompleted: true, onboardingVersion: 2 } }));

    const first = renderHook(() => useDemoSession());
    expect(first.result.current.ready).toBe(false);
    await waitFor(() => expect(first.result.current.user?.id).toBe('u-1'));
    first.unmount();

    const second = renderHook(() => useDemoSession());
    expect(second.result.current.ready).toBe(true);
    expect(second.result.current.user?.id).toBe('u-1');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
