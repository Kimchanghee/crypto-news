import { locales } from '@/i18n';

export const dynamic = 'force-dynamic';

// An explicit response avoids the legacy root layout's empty SSR 404 shell.
// Known locale, article, category and ad routes retain their existing handlers.
export function GET(_request: Request, { params }: { params: { locale: string } }) {
  const locale = locales.find((candidate) => candidate === params.locale) ?? 'en';
  const home = `/${locale}`;
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>404 - Page not found</title><style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.7;color:#e8edf6;background:#0e1116;margin:0}main{max-width:640px;margin:10vh auto;padding:28px}a{color:#a9d6ff}h1{font-size:clamp(1.6rem,4vw,2.3rem)}</style></head><body><main><p>404</p><h1>페이지를 찾을 수 없습니다 / Page not found</h1><p>주소를 확인하거나 첫 화면으로 돌아가세요. Check the URL or return to the home page.</p><a href="${home}">첫 화면 / Home</a></main></body></html>`;
  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}
