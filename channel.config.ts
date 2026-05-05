import type { Locale } from './i18n';
export type Category = { slug: string; name: Partial<Record<Locale, string>>; };
export type RSSSource = { url: string; category: string; weight?: number; };
export const channel = {
  id: 'CRYPTO',
  name: '크립토데일리',
  tagline: '비트코인·이더리움·디파이를 매일 쉽게',
  description: '비트코인, 이더리움, 알트코인, 디파이, NFT, 규제 뉴스를 초등생도 이해할 수 있게 정리합니다.',
  domain: 'cryptodaily.live',
  accent: 'green',
  keywords: ['비트코인', '이더리움', '암호화폐', '코인', '디파이', '블록체인'],
  geo: { country: 'KR', region: 'Asia', primaryCity: 'Seoul' },
  rssSources: [
    { url: 'https://news.google.com/rss/search?q=%EB%B9%84%ED%8A%B8%EC%BD%94%EC%9D%B8&hl=ko&gl=KR&ceid=KR:ko', category: 'market' },
    { url: 'https://news.google.com/rss/search?q=%EC%95%94%ED%98%B8%ED%99%94%ED%8F%90&hl=ko&gl=KR&ceid=KR:ko', category: 'breaking' },
    { url: 'https://news.google.com/rss/search?q=bitcoin&hl=en&gl=US&ceid=US:en', category: 'market' },
    { url: 'https://news.google.com/rss/search?q=ethereum+defi&hl=en&gl=US&ceid=US:en', category: 'analysis' },
    { url: 'https://news.google.com/rss/search?q=crypto+regulation&hl=en&gl=US&ceid=US:en', category: 'policy' }
  ] as RSSSource[],
  categories: [
    { slug: 'breaking', name: { ko: '속보', en: 'Breaking', ja: '速報', zh: '快讯', es: 'Última hora', pt: 'Última hora', de: 'Eilmeldung', fr: 'Dernières', ar: 'عاجل', hi: 'ब्रेकिंग', id: 'Terbaru' } },
    { slug: 'market',   name: { ko: '시장', en: 'Market', ja: '市場', zh: '市场', es: 'Mercado', pt: 'Mercado', de: 'Markt', fr: 'Marché', ar: 'السوق', hi: 'बाज़ार', id: 'Pasar' } },
    { slug: 'policy',   name: { ko: '규제', en: 'Regulation', ja: '規制', zh: '监管', es: 'Regulación', pt: 'Regulação', de: 'Regulierung', fr: 'Régulation', ar: 'تنظيم', hi: 'नियम', id: 'Regulasi' } },
    { slug: 'analysis', name: { ko: '분석', en: 'Analysis', ja: '分析', zh: '分析', es: 'Análisis', pt: 'Análise', de: 'Analyse', fr: 'Analyse', ar: 'تحليل', hi: 'विश्लेषण', id: 'Analisis' } }
  ] as Category[]
};
export type ChannelConfig = typeof channel;
