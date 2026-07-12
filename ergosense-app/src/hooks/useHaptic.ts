import { useEffect } from 'react';
import { vibrate } from './useClock';

export function useHaptic() {
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.closest('.btn,.ac,.fab,.bn-item,.di,.cch,.cam-btn,.shutter,.btn-back,.btn-act,.btn-home,.tag,.cch,.sc')
      ) {
        vibrate();
      }
    };
    document.addEventListener('touchstart', handler, { passive: true });
    return () => document.removeEventListener('touchstart', handler);
  }, []);
}
