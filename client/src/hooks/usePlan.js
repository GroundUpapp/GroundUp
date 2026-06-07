import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

// Module-level cache so every caller shares a single /billing/plan fetch.
let cachedPlan = null;
let inflight = null;

export function usePlan() {
  const [plan, setPlan] = useState(cachedPlan);
  const [loading, setLoading] = useState(cachedPlan == null);

  useEffect(() => {
    if (cachedPlan != null) return;
    if (!inflight) {
      inflight = apiGet('/billing/plan')
        .then((d) => (cachedPlan = d.plan || 'solo'))
        .catch(() => (cachedPlan = 'solo'));
    }
    let active = true;
    inflight.then((p) => {
      if (active) {
        setPlan(p);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Trial users get full Pro access.
  const isPro = plan === 'pro' || plan === 'trial';
  return { plan, isPro, loading };
}
