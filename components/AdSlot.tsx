/**
 * Universal ad slot. Picks a network per `network` prop:
 *   - 'mgid'      → MGID widget container (script set in layout)
 *   - 'adsterra'  → Adsterra banner script
 *
 * Both networks ship their own JS that hydrates child elements; we only
 * provide the container with the right data attribute / id.
 */
'use client';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  network: 'mgid' | 'adsterra';
  /** MGID widget id OR Adsterra script invoke key */
  zoneId?: string;
  /** Adsterra format: 'banner' | 'native' | 'social' | 'popunder' */
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
      // MGID widgets auto-hydrate when their script sees the container
      const w = (window as any)._mgwidget = (window as any)._mgwidget || [];
      w.push({ widgetId: zoneId });
    } else if (network === 'adsterra') {
      // Adsterra requires a separate <script> per slot
      const s = document.createElement('script');
      s.async = true;
      s.dataset.cfasync = 'false';
      const map = {
        banner:   `//www.profitableratecpm.com/${zoneId}/invoke.js`,
        native:   `//pl${zoneId}.profitableratecpm.com/${zoneId}/invoke.js`,
        social:   `//www.topcreativeformat.com/${zoneId}/invoke.js`,
        popunder: `//www.profitableratecpm.com/${zoneId}/invoke.js`
      } as const;
      s.src = map[format];
      ref.current.appendChild(s);
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

  return (
    <div className={`ad-wrapper ${className}`} style={{ minHeight: size?.h }}>
      <div className="ad-disclosure" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginBottom: 4 }}>
        {t('disclosure')}
      </div>
      {network === 'mgid' ? (
        <div ref={ref} data-mgwidget={zoneId} id={`M${zoneId}ScriptRootC`} />
      ) : (
        <div ref={ref} id={`adsterra-${zoneId}`} />
      )}
    </div>
  );
}
