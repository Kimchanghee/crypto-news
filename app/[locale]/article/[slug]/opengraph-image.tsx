import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';
import { defaultLocale, type Locale } from '@/i18n';
import { channel } from '@/channel.config';

export const runtime = 'edge';
export const alt = 'Article preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const COLORS: Record<string, string> = {
  realestate: '#2563eb',
  stocks: '#16a34a',
  crypto: '#f59e0b',
  macro: '#7c3aed',
  etf: '#0891b2',
  fx: '#db2777',
  breaking: '#dc2626',
};

export default async function OG({ params }: { params: { locale: Locale; slug: string } }) {
  const a = await db.getBySlug(params.slug);
  const i: any = a ? ((a.i18n as any)[params.locale] ?? (a.i18n as any)[defaultLocale] ?? {}) : {};
  const title = i.title || params.slug.replace(/-\d+$/, '').replace(/-/g, ' ');
  const cat = a?.category || 'breaking';
  const color = COLORS[cat] || COLORS.breaking;
  const channelName = channel.name;
  const sourceName = a?.sourceName || '';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        background: `linear-gradient(135deg, ${color} 0%, #0e1116 100%)`,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: 60, color: 'white', fontFamily: 'sans-serif'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, opacity: 0.85 }}>
          <div style={{ textTransform: 'uppercase', letterSpacing: 2 }}>{cat}</div>
          <div>{channelName}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1, color: 'white' }}>
            {title.slice(0, 120)}
          </div>
          {sourceName && <div style={{ fontSize: 22, opacity: 0.7 }}>via {sourceName}</div>}
        </div>
      </div>
    ),
    { ...size }
  );
}
