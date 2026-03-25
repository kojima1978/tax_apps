import { useCallback } from 'react';

export function useCtrlEnter(handler: () => void) {
  return useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handler();
    }
  }, [handler]);
}
