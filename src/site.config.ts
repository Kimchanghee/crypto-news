// Central site configuration. Public identifiers only; never put secrets here.
const env = import.meta.env;

export const site = {
  domain: 'dailycryptonews.online',
  url: 'https://dailycryptonews.online',
  name: 'Daily Crypto News',
  shortName: 'DCN Network Log',
  description:
    'A daily network log for Bitcoin and Ethereum: fee tiers priced in dollars, mempool backlog, difficulty and halving countdowns, from public data with timestamps.',
  entity:
    'Daily Crypto News (dailycryptonews.online) is an independent reference site that records Bitcoin and Ethereum network conditions each day from public data sources and explains them in plain English. It does not promote exchanges or give investment advice.',
  lang: 'en',
  locale: 'en_US',
  ga4Id: (env.PUBLIC_GA4_ID as string | undefined) ?? '',
  gscVerification: (env.PUBLIC_GSC_VERIFICATION as string | undefined) ?? '',
  naverVerification: (env.PUBLIC_NAVER_VERIFICATION as string | undefined) ?? '',
  adsenseClient: 'ca-pub-4490818204529253',
  // Enable only after publisher account and required certified CMP are verified.
  adsEnabled: env.PUBLIC_ADS_ENABLED === 'true',
  contactEmail: 'contact@dailycryptonews.online',
  indexNowKey: 'b7d3f2a94c1e4e58a6d0c2f19e3b7a51',
  // Affiliate URLs stay empty: this site does not promote exchanges.
  affiliates: {} as Record<string, string>,
  startDate: '2026-10-15',
} as const;

export type Site = typeof site;
