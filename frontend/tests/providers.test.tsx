import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import Providers from '@/app/providers';
import { useLanguage } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

function Probe() {
  const client = useQueryClient();
  const { language } = useLanguage();
  return <p>{`${language}-retry-${String(client.getDefaultOptions().queries?.retry)}`}</p>;
}

describe('Providers', () => {
  it('cấp cả LanguageContext cũ và QueryClient (thử lại tối đa 1 lần)', () => {
    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <Providers>
          <Probe />
        </Providers>
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('en-retry-1')).toBeInTheDocument();
  });
});
