type EventValue = string | number | boolean | null | undefined;
type EventParams = Record<string, EventValue>;

type GtagCommand = 'config' | 'event';
type GtagFn = (command: GtagCommand, target: string, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

const GA_MEASUREMENT_ID = 'G-MYM8Z3KX52';

const isAnalyticsReady = (): boolean =>
  typeof window !== 'undefined' && typeof window.gtag === 'function' && Boolean(GA_MEASUREMENT_ID);

const sanitizeParams = (params: EventParams): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
};

export const trackEvent = (eventName: string, params: EventParams = {}): void => {
  if (!isAnalyticsReady()) return;
  window.gtag?.('event', eventName, sanitizeParams(params));
};

export const trackPageView = (pagePath: string, language: string): void => {
  if (!isAnalyticsReady()) return;
  window.gtag?.('config', GA_MEASUREMENT_ID, {
    page_path: pagePath,
    page_location: typeof window !== 'undefined' ? window.location.href : pagePath,
    page_title: typeof document !== 'undefined' ? document.title : '',
    language,
  });
};

export const trackArticleOpen = (articleSlug: string, category: string, language: string): void => {
  trackEvent('article_open', {
    article_slug: articleSlug,
    article_category: category,
    article_language: language,
  });
};

export const trackArticleReadDepth = (
  articleSlug: string,
  category: string,
  language: string,
  depthPercent: number,
): void => {
  trackEvent('article_read_depth', {
    article_slug: articleSlug,
    article_category: category,
    article_language: language,
    depth_percent: depthPercent,
  });
};

export const trackAffiliateModuleView = (
  articleSlug: string,
  category: string,
  language: string,
  placement: string,
): void => {
  trackEvent('affiliate_module_view', {
    article_slug: articleSlug,
    article_category: category,
    article_language: language,
    affiliate_placement: placement,
  });
};

export const trackAffiliateClick = (
  articleSlug: string,
  category: string,
  language: string,
  network: string,
  placement: string,
  destinationHost: string,
): void => {
  trackEvent('affiliate_click', {
    article_slug: articleSlug,
    article_category: category,
    article_language: language,
    affiliate_network: network,
    affiliate_placement: placement,
    destination_host: destinationHost,
  });
};

export const trackAdSlotView = (
  articleSlug: string,
  category: string,
  language: string,
  slotId: string,
): void => {
  trackEvent('ad_slot_view', {
    article_slug: articleSlug,
    article_category: category,
    article_language: language,
    ad_platform: 'adsterra',
    ad_slot_id: slotId,
  });
};
