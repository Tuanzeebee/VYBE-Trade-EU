import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Handshake } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import {
  OnboardingAside,
  OnboardingShell,
  OnboardingStepper,
  ReviewSection,
  StepHeader,
  StepNav,
} from '@/components/onboarding';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/buyer/onboarding',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

function ui(node: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>{node}</LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const STEPS = ['Thông tin doanh nghiệp', 'Giấy phép & chứng nhận', 'Nhu cầu mua hàng', 'Xác nhận & hoàn tất'];

describe('OnboardingStepper dùng chung', () => {
  it('nav > ol > button: bước hiện tại có aria-current, bước đã qua có dấu tích', () => {
    ui(<OnboardingStepper steps={STEPS} current={3} onSelect={vi.fn()} />);
    const nav = screen.getByRole('navigation', { name: /Tiến trình/ });
    const buttons = within(nav).getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(buttons[2]).toHaveAttribute('aria-current', 'step');
    expect(buttons[0]).not.toHaveAttribute('aria-current');
    expect(buttons[0].querySelector('svg')).not.toBeNull(); // dấu tích
    expect(buttons[3].querySelector('svg')).toBeNull();
  });

  it('mặc định chỉ được quay lại; bước phía trước bị khoá', () => {
    const onSelect = vi.fn();
    ui(<OnboardingStepper steps={STEPS} current={2} onSelect={onSelect} />);
    const [one, , three] = screen.getAllByRole('button');
    expect(three).toBeDisabled();
    fireEvent.click(three);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(one);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('allowFutureJump (seller): bấm sang bước phía trước được', () => {
    const onSelect = vi.fn();
    ui(<OnboardingStepper steps={STEPS} current={1} onSelect={onSelect} allowFutureJump />);
    fireEvent.click(screen.getAllByRole('button')[3]);
    expect(onSelect).toHaveBeenCalledWith(4);
  });
});

describe('StepHeader', () => {
  it('"Bước N / M" là một text node, kèm tiêu đề và gợi ý', () => {
    ui(<StepHeader step={3} total={4} title="Nhu cầu mua hàng" hint="Cho biết bạn cần mua gì." titleId="t" />);
    expect(screen.getByText('Bước 3 / 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Nhu cầu mua hàng' })).toHaveAttribute('id', 't');
    expect(screen.getByText('Cho biết bạn cần mua gì.')).toBeInTheDocument();
  });
});

describe('StepNav', () => {
  it('chỉ có nút Tiếp tục (submit) khi không có onBack hay skip', () => {
    ui(<form><StepNav nextLabel="Tiếp tục" /></form>);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toHaveAttribute('type', 'submit');
  });

  it('Quay lại, Bỏ qua và nút tiếp theo kiểu button gọi đúng hàm; lỗi hiện role=alert', () => {
    const onBack = vi.fn();
    const onSkip = vi.fn();
    const onNext = vi.fn();
    ui(<StepNav error="Có lỗi." onBack={onBack} skip={{ label: 'Bỏ qua, bổ sung sau', onClick: onSkip }} nextLabel="Hoàn tất" nextType="button" onNext={onNext} nextIcon="check" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Có lỗi.');
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua, bổ sung sau' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tất' }));
    expect([onBack, onSkip, onNext].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('nextDisabled khoá nút tiếp theo (seller: chưa tick cam kết)', () => {
    const onNext = vi.fn();
    ui(<StepNav nextLabel="Hoàn tất" nextType="button" onNext={onNext} nextDisabled />);
    const button = screen.getByRole('button', { name: 'Hoàn tất' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('nhãn Quay lại tuỳ biến', () => {
    ui(<StepNav onBack={vi.fn()} backLabel="Quay lại Bước 3" nextLabel="Hoàn tất" />);
    expect(screen.getByRole('button', { name: 'Quay lại Bước 3' })).toBeInTheDocument();
  });
});

describe('ReviewSection', () => {
  it('hiện các dòng nhãn: giá trị, dấu — khi trống, nút Sửa có aria-label theo tiêu đề', () => {
    const onEdit = vi.fn();
    ui(<ReviewSection title="Giấy phép & chứng nhận" onEdit={onEdit} rows={[['Mã số VAT', 'DE123'], ['Mã LEI', '']]} />);
    expect(screen.getByText('DE123')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sửa: Giấy phép & chứng nhận' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('nhận children cho khối giàu nội dung (danh sách sản phẩm của seller)', () => {
    ui(<ReviewSection title="2. Sản phẩm" onEdit={vi.fn()}><p>Phi lê cá tra</p></ReviewSection>);
    expect(screen.getByText('Phi lê cá tra')).toBeInTheDocument();
  });
});

describe('OnboardingAside và OnboardingShell', () => {
  it('aside có h1, mô tả và từng lợi ích với tiêu đề h2', () => {
    ui(
      <OnboardingAside
        kicker="COMPANY ONBOARDING"
        heading={<>Tiêu đề chính</>}
        description={<>Mô tả ngắn</>}
        benefits={[{ icon: Handshake, title: 'Làm việc trực tiếp', text: 'Nhắn tin thẳng với nhà cung cấp.' }]}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tiêu đề chính');
    expect(screen.getByRole('heading', { level: 2, name: 'Làm việc trực tiếp' })).toBeInTheDocument();
    expect(screen.getByText('Mô tả ngắn')).toBeInTheDocument();
  });

  it('shell đặt header, thanh bước, aside, thẻ nội dung và overlays', () => {
    ui(
      <OnboardingShell
        header={<header>HEADER</header>}
        stepper={<div>STEPPER</div>}
        aside={<aside>ASIDE</aside>}
        cardLabelledBy="card-title"
        overlays={<div role="dialog">OVERLAY</div>}
      >
        <h2 id="card-title">Nội dung bước</h2>
      </OnboardingShell>,
    );
    for (const text of ['HEADER', 'STEPPER', 'ASIDE', 'OVERLAY']) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Nội dung bước' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('OVERLAY');
  });
});
