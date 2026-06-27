const COUPANG_ID = 999973;
const COUPANG_TRACKING = 'AF6328806';

type Props = {
  subId?: string;
  width?: number;
  height?: number;
  template?: 'carousel' | 'banner';
  loading?: 'eager' | 'lazy';
};

function buildCoupangSrcDoc(subId: string, width: number, height: number, template: Props['template']) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script src="https://ads-partners.coupang.com/g.js"><\/script><script>new PartnersCoupang.G({"id":${COUPANG_ID},"trackingCode":"${COUPANG_TRACKING}","subId":"${subId}","template":"${template}","width":"${width}","height":"${height}"});<\/script></body></html>`;
}

export function CoupangBanner({
  subId = '',
  width = 300,
  height = 250,
  template = 'carousel',
  loading = 'lazy',
}: Props) {
  return (
    <iframe
      title="coupang-partners-banner"
      width={width}
      height={height}
      scrolling="no"
      loading={loading}
      srcDoc={buildCoupangSrcDoc(subId, width, height, template)}
      style={{ border: 0, display: 'block', margin: '0 auto', maxWidth: '100%' }}
    />
  );
}
