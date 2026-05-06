'use client';
import { useEffect } from 'react';

export function AdsterraSocialBar() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_KEY;
    if (!url) return;
    const s = document.createElement('script');
    s.async = true;
    s.dataset.cfasync = 'false';
    s.src = /^(https?:)?\/\//.test(url) ? url : `//www.topcreativeformat.com/${url}/invoke.js`;
    document.body.appendChild(s);
    return () => { try { document.body.removeChild(s); } catch {} };
  }, []);
  return null;
}
