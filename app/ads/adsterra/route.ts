const DEFAULT_HOST = 'molecularshindy.com';
const DEFAULT_FALLBACK_URL = 'https://link.coupang.com/a/efySALPmDc';
const KEY_RE = /^[a-z0-9]{32}$/i;
const HOST_RE = /^[a-z0-9.-]+$/i;

export const dynamic = 'force-dynamic';

function readSize(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), 1), 1200);
}

function readFallbackUrl() {
  const value = process.env.NEXT_PUBLIC_COUPANG_FALLBACK_URL || DEFAULT_FALLBACK_URL;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.toString() : DEFAULT_FALLBACK_URL;
  } catch {
    return DEFAULT_FALLBACK_URL;
  }
}

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';
  if (!KEY_RE.test(key)) {
    return new Response('Invalid ad key', { status: 400 });
  }

  const hostCandidate = url.searchParams.get('host') || DEFAULT_HOST;
  const host = HOST_RE.test(hostCandidate) ? hostCandidate : DEFAULT_HOST;
  const width = readSize(url.searchParams.get('w'), 300);
  const height = readSize(url.searchParams.get('h'), 250);
  const scriptSrc = `https://${host}/${key}/invoke.js`;
  const fallbackHref = escapeAttr(readFallbackUrl());

  const body = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <style>
    html,body{margin:0;padding:0;overflow:hidden;background:transparent}
    body{display:grid;place-items:center;min-height:${height}px;font-family:Arial,sans-serif}
    #ad{position:relative;width:${width}px;min-height:${height}px}
    #slot{width:${width}px;min-height:${height}px}
    #fallback{position:absolute;inset:0;display:grid;place-items:center;gap:4px;text-align:center;text-decoration:none;color:#111827;background:#f8fafc;border:1px solid #d7dde8;border-radius:4px;opacity:0;pointer-events:none;transition:opacity .18s ease}
    #fallback[data-visible="true"]{opacity:1;pointer-events:auto}
    #fallback span{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#667085}
    #fallback strong{display:block;padding:0 14px;font-size:16px;line-height:1.3}
    #fallback em{font-style:normal;font-size:12px;color:#445064}
  </style>
</head>
<body>
  <div id="ad">
    <div id="slot">
      <script type="text/javascript">
        atOptions = {'key':'${key}','format':'iframe','height':${height},'width':${width},'params':{}};
      </script>
      <script type="text/javascript" src="${scriptSrc}"></script>
    </div>
    <a id="fallback" href="${fallbackHref}" target="_blank" rel="noopener noreferrer nofollow sponsored" data-visible="false">
      <span>Sponsored</span>
      <strong>Coupang partner picks</strong>
      <em>Open shopping deals</em>
    </a>
  </div>
  <script>
    (function(){
      var ad = document.getElementById('ad');
      var fallback = document.getElementById('fallback');
      if (!ad || !fallback || !window.MutationObserver) return;
      function hasCreative(){
        var nodes = ad.querySelectorAll('iframe,img,ins,object,embed');
        for (var i = 0; i < nodes.length; i++) {
          var rect = nodes[i].getBoundingClientRect();
          if (rect.width > 8 && rect.height > 8) return true;
        }
        return false;
      }
      function sync(){
        fallback.setAttribute('data-visible', hasCreative() ? 'false' : 'true');
      }
      var observer = new MutationObserver(function(){
        fallback.setAttribute('data-visible', 'false');
        window.requestAnimationFrame(sync);
      });
      observer.observe(ad, { childList: true, subtree: true, attributes: true });
      window.setTimeout(sync, 2600);
      window.setTimeout(sync, 6000);
    })();
  </script>
</body>
</html>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=300'
    }
  });
}
