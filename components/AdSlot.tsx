type Props = {
  network: 'mgid' | 'adsterra';
  zoneId?: string;
  format?: 'banner' | 'native' | 'social' | 'popunder';
  size?: { w: number; h: number };
  className?: string;
  slotId?: string;
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

export function AdSlot({ network, zoneId, size, className, slotId }: Props) {
  if (network !== 'adsterra') return null;
  const key = pickAdsterraKey(zoneId);
  if (!key) return null;

  const width = size?.w ?? 300;
  const height = size?.h ?? 250;
  const host = process.env.NEXT_PUBLIC_ADSTERRA_IFRAME_HOST || 'molecularshindy.com';
  const params = new URLSearchParams({
    key,
    host,
    w: String(width),
    h: String(height),
  });

  return (
    <iframe
      title={`adsterra-banner-${key.slice(0, 8)}`}
      data-adsterra-slot="true"
      data-ad-slot-id={slotId}
      width={width}
      height={height}
      loading="eager"
      scrolling="no"
      src={`/ads/adsterra?${params.toString()}`}
      style={{ border: 0, display: 'block', margin: '0 auto', maxWidth: '100%' }}
      className={className}
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
