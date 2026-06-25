import Script from 'next/script';

const KEY_RE = /^[a-f0-9]{32}$/i;
const HOST_RE = /^[a-z0-9.-]+$/i;
const DEFAULT_HOST = 'molecularshindy.com';

function normalizeSrc(value?: string) {
  if (!value) return '';
  try {
    const url = new URL(value.trim());
    return /^https?:$/.test(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function buildSrc(key?: string, host?: string) {
  const normalizedKey = key?.trim().match(KEY_RE)?.[0];
  if (!normalizedKey) return '';
  const hostCandidate = host?.trim() || DEFAULT_HOST;
  const normalizedHost = HOST_RE.test(hostCandidate) ? hostCandidate : DEFAULT_HOST;
  return `https://${normalizedHost}/${normalizedKey}/invoke.js`;
}

export function AdsterraSocialBar() {
  const src = normalizeSrc(process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_SRC)
    || buildSrc(process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_KEY, process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_HOST || process.env.NEXT_PUBLIC_ADSTERRA_SCRIPT_HOST);
  if (!src) return null;

  return <Script id="adsterra-social-bar" strategy="afterInteractive" src={src} />;
}
