'use client';

import React from 'react';
import PricingPlans from '../PricingPlans';
import { LegacyGate } from '../app-shell/LegacyGate';

export function PricingRoute() {
  return <LegacyGate page="pricing">{(user) => <PricingPlans account={user} />}</LegacyGate>;
}
