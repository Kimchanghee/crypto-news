/**
 * Universal ad slot. Picks a network per `network` prop:
 *   - 'mgid'      → MGID widget container; loader script set in layout
 *   - 'adsterra'  → Adsterra Beta full <script src="..."> URL (each zone gets a unique CDN path)
 *
 * Both networks ship their own JS that hydrates child elements; we provide
 * the container with the right data attribute / id and inject the script.
 */
'use client';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  network: 'mgid' | 'adsterra';
  /**
   * For MGID: widget id (number/string)
   * For Adsterra Beta: full script URL like
   *   "https://molecularshindy.com/d1/63/0c/d1630c2f93caf486af3fac6ad5eeda12.js"
   * (paste the entire URL from the Adsterra "GET CODE" dialog into env vars).
   */
  zoneId?: string;
  /** Adsterra format hint (used for container styling / labeling) */
  format?: 'banner' | 'native' | 'social' | 'popunder';
  size?: { w: number; h: number };
  className?: string;
};

export function AdSlot({ network, zoneId, format = 'banner', size, className = '' }: Props) {
  const t = useTranslations('ad');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !zoneId) return;
    if (network === 'mgid') {
      const w = (window as any)._mgwidget = (window as any)._mgwidget || [];
      w.push({ widgetId: zoneId });
    } else if (network === 'adsterra') {
      // Adsterra Beta: zoneId IS the full script URL
      const s = document.createElement('script');
      s.async = true;
      s.dataset.cfasync = 'false';
      s.src = zoneId.startsWith('http') || zoneId.startsWith('//') ? zoneId : `https://${zoneId}`;
      // Popunder/Social Bar attach to <head> globally; banners append into the slot
      if (format === 'popunder' || format === 'social') {
        document.head.appendChild(s);
      } else {
        ref.current.appendChild(s);
      }
    }
  }, [network, zoneId, format]);

  if (!zoneId) {
    return (
      <div
        className={`ad-slot ${className}`}
        style={size ? { minHeight: size.h, minWidth: size.w } : undefined}
      >
        <span>{t('disclosure')}</span>
      </div>
    );
  }

  // Popunder / Social Bar render no visible container
  if (network === 'adsterra' && (format === 'popunder' || format === 'social')) {
    return null;
  }

  return (
    <div className={`ad-wrapper ${className}`} style={{ minHeight: size?.h }}>
      <div className="ad-disclosure" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginBottom: 4 }}>
        {t('disclosure')}
      </div>
      {network === 'mgid' ? (
        <div ref={ref} data-mgwidget={zoneId} id={`M${zoneId}ScriptRootC`} />
      ) : (
        <div ref={ref} className="ad-container" />
      )}
    </div>
  );
}
