/**
 * Adsterra popunder. One per site, mounted in root layout.
 */
'use client';
import { useEffect } from 'react';

export function AdsterraPopunder() {
  const key = process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_KEY;
  useEffect(() => {
    if (!key || typeof window === 'undefined') return;
    if (document.getElementById('adsterra-popunder-script')) return;
    const s = document.createElement('script');
    s.id = 'adsterra-popunder-script';
    s.async = true;
    s.dataset.cfasync = 'false';
    s.src = `//pl${key}.profitableratecpm.com/${key}/invoke.js`;
    document.body.appendChild(s);
  }, [key]);
  return null;
}
