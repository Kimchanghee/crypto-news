'use client';

import { useEffect } from 'react';
import {
  trackAdSlotView,
  trackAffiliateClick,
  trackAffiliateModuleView,
  trackArticleOpen,
  trackArticleReadDepth,
} from '@/lib/analytics';
import type { Locale } from '@/i18n';

type Props = {
  articleSlug: string;
  articleCategory: string;
  locale: Locale;
};

const READ_DEPTH_POINTS = [25, 50, 75, 90];

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

export function ArticleExperienceTracker({ articleSlug, articleCategory, locale }: Props) {
  useEffect(() => {
    trackArticleOpen(articleSlug, articleCategory, locale);

    const firedDepths = new Set<number>();

    const onScroll = () => {
      const root = document.documentElement;
      const maxScroll = root.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const depth = Math.round((window.scrollY / maxScroll) * 100);
      for (const point of READ_DEPTH_POINTS) {
        if (depth < point || firedDepths.has(point)) continue;
        firedDepths.add(point);
        trackArticleReadDepth(articleSlug, articleCategory, locale, point);
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [articleCategory, articleSlug, locale]);

  useEffect(() => {
    const moduleSeen = new Set<string>();
    const adSeen = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.45) continue;
          const element = entry.target as HTMLElement;

          const modulePlacement = element.dataset.affiliatePlacement;
          if (modulePlacement && !moduleSeen.has(modulePlacement)) {
            moduleSeen.add(modulePlacement);
            trackAffiliateModuleView(articleSlug, articleCategory, locale, modulePlacement);
          }

          const adSlotId = element.dataset.adSlotId;
          if (adSlotId && !adSeen.has(adSlotId)) {
            adSeen.add(adSlotId);
            trackAdSlotView(articleSlug, articleCategory, locale, adSlotId);
          }
        }
      },
      { threshold: [0.45, 0.8] },
    );

    document.querySelectorAll<HTMLElement>('[data-affiliate-module],[data-ad-slot-id]').forEach((node) => {
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, [articleCategory, articleSlug, locale]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-affiliate-network]') : null;
      if (!target) return;
      const network = target.dataset.affiliateNetwork || 'unknown';
      const placement = target.dataset.affiliatePlacement || 'unknown';
      const destinationHost = hostOf(target.href);
      trackAffiliateClick(articleSlug, articleCategory, locale, network, placement, destinationHost);
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [articleCategory, articleSlug, locale]);

  return null;
}
