/**
 * Adsterra popunder. One per site, mounted in root layout.
 * Supports both Adsterra Beta full URLs and legacy invoke keys.
 */
'use client';
import { useEffect } from 'react';

export function AdsterraPopunder() {
  const displayAdsEnabled = process.env.NEXT_PUBLIC_ENABLE_DISPLAY_ADS === 'true';
  const key = process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_KEY;
  useEffect(() => {
    if (!displayAdsEnabled || !key || typeof window === 'undefined') return;
    if (document.getElementById('adsterra-popunder-script')) return;
    const s = document.createElement('script');
    s.id = 'adsterra-popunder-script';
    s.async = true;
    s.dataset.cfasync = 'false';
    // If key is already a full URL (Adsterra Beta), use it directly; else legacy template
    s.src = key.startsWith('http') || key.startsWith('//') ? key : `//pl${key}.profitableratecpm.com/${key}/invoke.js`;
    document.body.appendChild(s);
  }, [displayAdsEnabled, key]);
  return null;
}
