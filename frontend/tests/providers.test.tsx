import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Providers } from '@/components/providers';

function Probe() {
  const client = useQueryClient();
  return <p>{client.getDefaultOptions().queries?.retry === 1 ? 'retry-1' : 'khác'}</p>;
}

describe('Providers', () => {
  it('cấp QueryClient cho cây con, thử lại tối đa 1 lần', () => {
    render(
      <Providers>
        <Probe />
      </Providers>,
    );
    expect(screen.getByText('retry-1')).toBeInTheDocument();
  });
});
