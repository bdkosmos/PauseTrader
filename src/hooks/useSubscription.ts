import { useCallback, useEffect, useState } from 'react';
import type { PlanId } from '../lib/plans';

const STORAGE_KEY = 'pausetrader-plan';

function loadPlan(): PlanId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'pro' ? 'pro' : 'free';
  } catch {
    return 'free';
  }
}

export function useSubscription() {
  const [plan, setPlan] = useState<PlanId>(loadPlan);
  const [pricingOpen, setPricingOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, plan);
  }, [plan]);

  const isPro = plan === 'pro';

  const openPricing = useCallback(() => setPricingOpen(true), []);
  const closePricing = useCallback(() => setPricingOpen(false), []);

  const activatePro = useCallback(() => {
    setPlan('pro');
    setPricingOpen(false);
  }, []);

  const deactivatePro = useCallback(() => {
    setPlan('free');
  }, []);

  const requirePro = useCallback(
    (action: () => void) => {
      if (isPro) {
        action();
        return true;
      }
      setPricingOpen(true);
      return false;
    },
    [isPro],
  );

  return {
    plan,
    isPro,
    pricingOpen,
    openPricing,
    closePricing,
    activatePro,
    deactivatePro,
    requirePro,
  };
}