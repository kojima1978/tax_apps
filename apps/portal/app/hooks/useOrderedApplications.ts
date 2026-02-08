'use client';

import { useState, useEffect } from 'react';
import type { Application } from '@/types/application';
import { applySavedOrder } from '@/lib/order';

export function useOrderedApplications(applications: Application[]) {
  const [orderedApps, setOrderedApps] = useState<Application[]>(applications);

  useEffect(() => {
    setOrderedApps(applySavedOrder(applications));
  }, [applications]);

  return [orderedApps, setOrderedApps] as const;
}
