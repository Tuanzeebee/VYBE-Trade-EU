'use client';

// Trang đăng nhập / đăng ký — mỗi route một file để trang chỉ tải đúng component của nó.
import React from 'react';
import { useSearchParams } from 'next/navigation';
import AuthPage from '../AuthPage';
import { LegacyGate } from '../app-shell/LegacyGate';
import { useLegacyNavigate } from '../app-shell/useLegacyNavigate';
import type { DemoUser } from '../../lib/demoAuth';
import { roleFromType } from '../../lib/legacyNav';
import { useGoHome } from './accountHooks';

function AuthContent({ mode, user }: { mode: 'login' | 'register'; user: DemoUser | null }) {
  const navigate = useLegacyNavigate(user);
  const goHome = useGoHome();
  const initialRole = roleFromType(useSearchParams().get('type'));
  return (
    <AuthPage
      key={mode}
      mode={mode}
      initialRole={initialRole}
      onModeChange={(next) => navigate(next)}
      onAuthenticated={goHome}
      onNavigateHome={() => navigate('home')}
    />
  );
}

export function AuthRoute({ mode }: { mode: 'login' | 'register' }) {
  return <LegacyGate page={mode}>{(user) => <AuthContent mode={mode} user={user} />}</LegacyGate>;
}
