type Props = {
  network: 'mgid' | 'adsterra';
  zoneId?: string;
  format?: 'banner' | 'native' | 'social' | 'popunder';
  size?: { w: number; h: number };
  className?: string;
};

function pickAdsterraKey(explicit?: string) {
  return (
    explicit ||
    process.env.NEXT_PUBLIC_ADSTERRA_BANNER_300_KEY ||
    process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY ||
    process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_KEY ||
    process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_KEY ||
    process.env.NEXT_PUBLIC_ADSTERRA_SMARTLINK_KEY ||
    ''
  );
}

function buildSrcDoc(key: string, width: number, height: number) {
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}body{display:grid;place-items:center;min-height:${height}px}#ad{width:${width}px;min-height:${height}px}</style></head><body><div id="ad"></div><script type="text/javascript">atOptions={'key':'${key}','format':'iframe','height':${height},'width':${width},'params':{}};<\/script><script type="text/javascript" src="https://www.highperformanceformat.com/${key}/invoke.js"><\/script></body></html>`;
}

export function AdSlot({ network, zoneId, size, className }: Props) {
  if (network !== 'adsterra') return null;
  const key = pickAdsterraKey(zoneId);
  if (!key) return null;

  const width = size?.w ?? 300;
  const height = size?.h ?? 250;

  return (
    <iframe
      title={`safe-inline-adsterra-${key.slice(0, 8)}`}
      width={width}
      height={height}
      loading="eager"
      scrolling="no"
      srcDoc={buildSrcDoc(key, width, height)}
      style={{ border: 0, display: 'block', margin: '0 auto', maxWidth: '100%' }}
      className={className}
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
