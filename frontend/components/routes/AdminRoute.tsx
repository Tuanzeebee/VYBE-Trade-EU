'use client';

import React from 'react';
import AdminConsole from '../AdminConsole';
import { LegacyGate } from '../app-shell/LegacyGate';
import { PublicShell } from '../app-shell/PublicShell';

export function AdminRoute() {
  return (
    <LegacyGate page="admin">
      {() => (
        <PublicShell>
          <AdminConsole />
        </PublicShell>
      )}
    </LegacyGate>
  );
}
