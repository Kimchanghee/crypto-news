'use client';
import { usePathname, useRouter } from 'next/navigation';
import { localeNames, locales, type Locale } from '@/i18n';

export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const pathname = usePathname();

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Locale;
    const segs = pathname.split('/').filter(Boolean);

    if (segs[1] === 'article' && segs[2]) {
      try {
        const res = await fetch(`/api/article-locales/${encodeURIComponent(segs[2])}`, { cache: 'no-store' });
        const data = res.ok ? await res.json() : null;
        if (!data?.locales?.includes(next)) {
          router.push(`/${next}`);
          return;
        }
      } catch {
        router.push(`/${next}`);
        return;
      }
    }

    if (locales.includes(segs[0] as Locale)) segs[0] = next; else segs.unshift(next);
    router.push('/' + segs.join('/'));
  }

  return (
    <select
      value={current}
      onChange={onChange}
      style={{
        background: 'var(--paper)',
        color: 'var(--ink)',
        border: '1px solid var(--soft)',
        borderRadius: 999,
        padding: '4px 10px',
        fontFamily: 'Poppins',
        fontSize: 13,
        cursor: 'pointer'
      }}
      aria-label="Language"
    >
      {locales.map((l) => (
        <option key={l} value={l}>{localeNames[l]}</option>
      ))}
    </select>
  );
}
