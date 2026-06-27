type Props = {
  network: 'mgid' | 'adsterra';
  zoneId?: string;
  format?: 'banner' | 'native' | 'social' | 'popunder';
  size?: { w: number; h: number };
  className?: string;
  slotId?: string;
};

const DEFAULT_ADSTERRA_KEY = '3e4bce1484f612934ea3087016160d51';
const DEFAULT_ADSTERRA_HOST = 'molecularshindy.com';

function normalizeAdsterraKey(value?: string) {
  const key = value?.trim().match(/^[a-f0-9]{32}$/i)?.[0];
  return key || '';
}

function pickAdsterraKey(explicit?: string, width = 300) {
  const sizeKey = width >= 728
    ? process.env.NEXT_PUBLIC_ADSTERRA_BANNER_728_KEY
    : process.env.NEXT_PUBLIC_ADSTERRA_BANNER_300_KEY;
  const candidates = [
    explicit,
    sizeKey,
    process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY,
    DEFAULT_ADSTERRA_KEY
  ];

  return candidates.map(normalizeAdsterraKey).find(Boolean) || '';
}

function pickAdsterraHost() {
  return process.env.NEXT_PUBLIC_ADSTERRA_SCRIPT_HOST || DEFAULT_ADSTERRA_HOST;
}

function buildInvokeSrc(key: string) {
  return `https://${pickAdsterraHost()}/${key}/invoke.js`;
}

function buildOptionsScript(key: string, width: number, height: number) {
  return `atOptions = {'key':'${key}','format':'iframe','height':${height},'width':${width},'params':{}};`;
}

export function AdSlot({ network, zoneId, size, className, slotId }: Props) {
  if (network !== 'adsterra') return null;

  const width = size?.w ?? 300;
  const height = size?.h ?? 250;
  const key = pickAdsterraKey(zoneId, width);
  if (!key) return null;

  return (
    <div
      data-adsterra-slot="true"
      data-ad-slot-id={slotId}
      style={{ display: 'block', margin: '0 auto', maxWidth: '100%', overflow: 'hidden', width, minHeight: height }}
      className={className}
      suppressHydrationWarning
    >
      <script
        type="text/javascript"
        dangerouslySetInnerHTML={{ __html: buildOptionsScript(key, width, height) }}
      />
      <script src={buildInvokeSrc(key)} type="text/javascript" />
    </div>
  );
}
