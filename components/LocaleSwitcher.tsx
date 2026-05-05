'use client';
import { usePathname, useRouter } from 'next/navigation';
import { localeNames, locales, type Locale } from '@/i18n';

export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const pathname = usePathname();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Locale;
    const segs = pathname.split('/').filter(Boolean);
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
