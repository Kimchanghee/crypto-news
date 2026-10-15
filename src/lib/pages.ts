import { getCollection } from 'astro:content';
import { latest, days } from './data';

export interface SitePage { path: string; lastmod: string; title?: string; summary?: string }

const STATIC_DATE = '2026-10-15';

/** Every indexable URL with a real lastmod (content date or data date). */
export async function allPages(): Promise<SitePage[]> {
  const guides = await getCollection('guides');
  const dataDate = latest.btc.asOf as string;
  return [
    { path: '/', lastmod: dataDate, title: 'Today’s Bitcoin & Ethereum network log', summary: 'Fee tiers in USD, mempool backlog, difficulty, halving, ETH base fee.' },
    { path: '/log/', lastmod: days[0]?.asOf ?? dataDate, title: 'Log archive', summary: 'Daily entries since 2026-10-15.' },
    ...days.map((d) => ({ path: `/log/${d.date}/`, lastmod: d.asOf, title: `Network log ${d.date}`, summary: `${d.readings.length} recorded reading(s).` })),
    { path: '/tools/', lastmod: STATIC_DATE, title: 'Tools' },
    { path: '/tools/btc-fee-estimator/', lastmod: dataDate, title: 'Bitcoin fee estimator', summary: 'Estimate vsize and fee in sats and USD.' },
    { path: '/tools/halving-countdown/', lastmod: dataDate, title: 'Halving and difficulty countdowns', summary: 'Blocks to the next halving and retarget.' },
    { path: '/guides/', lastmod: guides.map((g) => g.data.updated).sort().at(-1) ?? STATIC_DATE, title: 'Guides' },
    ...guides.map((g) => ({ path: `/guides/${g.id}/`, lastmod: g.data.updated, title: g.data.h1, summary: g.data.answer })),
    { path: '/methodology/', lastmod: STATIC_DATE, title: 'Methodology and data sources' },
    { path: '/about/', lastmod: STATIC_DATE, title: 'About' },
    { path: '/contact/', lastmod: STATIC_DATE, title: 'Contact' },
    { path: '/privacy/', lastmod: STATIC_DATE, title: 'Privacy policy' },
    { path: '/terms/', lastmod: STATIC_DATE, title: 'Terms' },
    { path: '/disclaimer/', lastmod: STATIC_DATE, title: 'Disclaimer' },
  ];
}
