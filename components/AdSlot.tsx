'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  network: 'mgid' | 'adsterra';
  zoneId?: string;
  format?: 'banner' | 'native' | 'social' | 'popunder';
  size?: { w: number; h: number };
  className?: string;
};

const FALLBACK_PROMOS = [
  { title: '11개 언어 자동 번역', desc: '한 번 작성하면 11개 언어로 자동 노출' },
  { title: '매일 5분 안에 핵심 뉴스', desc: '뉴스 어귺리게이터 + AI 큐레이션' },
  { title: 'Get notifications', desc: 'Subscribe to our daily digest' },
];

export function AdSlot({ network, zoneId, format = 'banner', size, className = '' }: Props) {
  const displayAdsEnabled = process.env.NEXT_PUBLIC_ENABLE_DISPLAY_ADS === 'true';
  const t = useTranslations('ad');
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  // IntersectionObserver
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
    }, { rootMargin: '300px' });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // Load ad
  useEffect(() => {
    if (!displayAdsEnabled || !ref.current || !zoneId || !isVisible) return;
    if (network === 'mgid') {
      const w = (window as any)._mgwidget = (window as any)._mgwidget || [];
      w.push({ widgetId: zoneId });
    } else if (network === 'adsterra') {
      const s = document.createElement('script');
      s.async = true;
      s.dataset.cfasync = 'false';
      // zoneId can be either a full URL (https://molecularshindy.com/.../invoke.js)
      // or just an invoke key. Detect protocol/scheme.
      if (/^(https?:)?\/\//.test(zoneId)) {
        s.src = zoneId;
      } else {
        // Fallback to legacy path building
        const map: Record<string, string> = {
          banner:   `//www.profitableratecpm.com/${zoneId}/invoke.js`,
          native:   `//pl${zoneId}.profitableratecpm.com/${zoneId}/invoke.js`,
          social:   `//www.topcreativeformat.com/${zoneId}/invoke.js`,
          popunder: `//www.profitableratecpm.com/${zoneId}/invoke.js`
        };
        s.src = map[format] || map.banner;
      }
      s.onload = () => {
        setTimeout(() => {
          if (ref.current && ref.current.children.length > 1) setHasContent(true);
        }, 2500);
      };
      ref.current.appendChild(s);
    }
  }, [displayAdsEnabled, network, zoneId, format, isVisible]);

  const promo = FALLBACK_PROMOS[Math.floor(Math.random() * FALLBACK_PROMOS.length)];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const responsiveSize = size ? {
    minHeight: isMobile && size.w > 360 ? Math.min(250, size.h) : size.h,
    minWidth: isMobile && size.w > 360 ? '100%' as const : size.w
  } : undefined;

  if (!displayAdsEnabled) return null;

  if (!zoneId) {
    return (
      <div className={`ad-slot ${className}`} style={{ ...responsiveSize, padding: 16, background: 'linear-gradient(135deg, var(--soft) 0%, var(--card) 100%)', borderRadius: 8, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{t('sponsored')}</div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{promo.title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{promo.desc}</div>
      </div>
    );
  }

  return (
    <div className={`ad-wrapper ${className}`} style={responsiveSize}>
      <div className="ad-disclosure" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginBottom: 4 }}>
        {t('disclosure')}
      </div>
      {network === 'mgid' ? (
        <div ref={ref} data-mgwidget={zoneId} id={`M${(zoneId||'').replace(/[^a-zA-Z0-9]/g,'')}ScriptRootC`} />
      ) : (
        <div ref={ref} id={`adsterra-${(zoneId||'').replace(/[^a-zA-Z0-9]/g,'').slice(0,20)}`}>
          {!hasContent && (
            <div style={{ padding: 12, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>{promo.title}</div>
          )}
        </div>
      )}
    </div>
  );
}
