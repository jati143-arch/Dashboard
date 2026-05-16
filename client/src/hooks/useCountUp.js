import { useState, useEffect, useRef } from 'react';

export function useCountUp(target, duration = 1200, decimals = 0) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target == null || isNaN(target)) return;
    const startVal = 0;
    const endVal = target;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function tick(now) {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const current = startVal + (endVal - startVal) * easeOut(progress);
      setValue(parseFloat(current.toFixed(decimals)));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    startRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals]);

  return value;
}
