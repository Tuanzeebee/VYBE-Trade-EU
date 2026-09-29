import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

describe('ui', () => {
  it('cn gộp class và để class sau thắng xung đột tailwind', () => {
    expect(cn('px-2 text-sm', false && 'hidden', 'px-4')).toBe('text-sm px-4');
  });

  it('Button mặc định là <button type="button">, asChild render phần tử con', () => {
    render(
      <>
        <Button>Lưu</Button>
        <Button asChild variant="outline">
          <a href="https://example.com">Trang chủ</a>
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Lưu' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveClass('border');
  });

  it('Label gắn với Input qua htmlFor', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" />
      </>,
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  });

  it('Card và Badge render nội dung', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Tiêu đề</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="success">Đã xác minh</Badge>
        </CardContent>
      </Card>,
    );
    expect(screen.getByText('Tiêu đề')).toBeInTheDocument();
    expect(screen.getByText('Đã xác minh')).toBeInTheDocument();
  });
});
