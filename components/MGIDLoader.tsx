/**
 * Loads the MGID main loader script once per page.
 * Read NEXT_PUBLIC_MGID_LOADER (path returned by MGID dashboard, e.g. //jsc.mgid.com/some/path.js).
 */
'use client';
import Script from 'next/script';

export function MGIDLoader() {
  const src = process.env.NEXT_PUBLIC_MGID_LOADER;
  if (!src) return null;
  return <Script src={src} strategy="afterInteractive" />;
}
