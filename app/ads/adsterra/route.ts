const DEFAULT_HOST = 'molecularshindy.com';
const KEY_RE = /^[a-z0-9]{32}$/i;
const HOST_RE = /^[a-z0-9.-]+$/i;

export const dynamic = 'force-dynamic';

function readSize(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), 1), 1200);
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

  const body = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <style>
    html,body{margin:0;padding:0;overflow:hidden;background:transparent}
    body{display:grid;place-items:center;min-height:${height}px}
    #ad{width:${width}px;min-height:${height}px}
  </style>
</head>
<body>
  <div id="ad">
    <script type="text/javascript">
      atOptions = {'key':'${key}','format':'iframe','height':${height},'width':${width},'params':{}};
    </script>
    <script type="text/javascript" src="${scriptSrc}"></script>
  </div>
</body>
</html>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=300'
    }
  });
}
