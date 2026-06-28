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
    #slot{position:relative;z-index:1;width:${width}px;min-height:${height}px}
    #fallback{position:absolute;inset:0;z-index:2;display:grid;place-items:center;gap:4px;text-align:center;text-decoration:none;color:#111827;background:#f8fafc;border:1px solid #d7dde8;border-radius:4px;opacity:1;pointer-events:auto;transition:opacity .18s ease}
    #fallback[data-visible="false"]{opacity:0;pointer-events:none}
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
    <a id="fallback" href="${fallbackHref}" target="_blank" rel="noopener noreferrer nofollow sponsored" data-visible="true">
      <span>Sponsored</span>
      <strong>Sponsored shopping deals</strong>
      <em>Open offer</em>
    </a>
  </div>
  <script>
    (function(){
      var ad = document.getElementById('ad');
      var fallback = document.getElementById('fallback');
      if (!ad || !fallback || !window.MutationObserver) return;
      function iframeReady(node){
        try {
          var doc = node.contentDocument;
          if (doc) {
            var body = doc.body;
            var html = doc.documentElement ? doc.documentElement.outerHTML : '';
            if ((body && (body.children.length > 0 || (body.innerText || '').trim().length > 0)) || html.length > 80) return true;
          }
        } catch (error) {
          return true;
        }
        try {
          var attrSrc = node.getAttribute('src') || '';
          if (attrSrc && !/^about:(blank|srcdoc)$/i.test(attrSrc)) return true;
        } catch (error) {}
        try {
          if (node.src && !/^about:(blank|srcdoc)$/i.test(node.src)) return true;
        } catch (error) {}
        try {
          var href = node.contentWindow && node.contentWindow.location ? node.contentWindow.location.href : '';
          if (href && !/^about:(blank|srcdoc)$/i.test(href)) return true;
        } catch (error) {
          return true;
        }
        return false;
      }
      function hasCreative(){
        var richNodes = ad.querySelectorAll('img,ins,object,embed');
        for (var i = 0; i < richNodes.length; i++) {
          var richRect = richNodes[i].getBoundingClientRect();
          if (richRect.width > 8 && richRect.height > 8) return true;
        }
        var frames = ad.querySelectorAll('iframe');
        for (var j = 0; j < frames.length; j++) {
          var rect = frames[j].getBoundingClientRect();
          if (rect.width > 8 && rect.height > 8 && iframeReady(frames[j])) return true;
        }
        return false;
      }
      function sync(){
        fallback.setAttribute('data-visible', hasCreative() ? 'false' : 'true');
      }
      var observer = new MutationObserver(function(){
        window.requestAnimationFrame(sync);
        window.setTimeout(sync, 120);
      });
      observer.observe(ad, { childList: true, subtree: true, attributes: true });
      sync();
      window.setTimeout(sync, 900);
      window.setTimeout(sync, 1800);
      window.setTimeout(sync, 3200);
      window.setTimeout(sync, 6000);
      window.setTimeout(sync, 10000);
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
