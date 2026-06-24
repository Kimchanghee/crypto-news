const COUPANG_ID = 999973;
const COUPANG_TRACKING = 'AF6328806';

function buildCoupangSrcDoc(subId: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script src="https://ads-partners.coupang.com/g.js"><\/script><script>new PartnersCoupang.G({"id":${COUPANG_ID},"trackingCode":"${COUPANG_TRACKING}","subId":"${subId}","template":"carousel","width":"300","height":"250"});<\/script></body></html>`;
}

export function CoupangBanner({ subId = '' }: { subId?: string }) {
  return (
    <iframe
      title="coupang-partners-banner"
      width={300}
      height={250}
      scrolling="no"
      loading="lazy"
      srcDoc={buildCoupangSrcDoc(subId)}
      style={{ border: 0, display: 'block', margin: '0 auto', maxWidth: '100%' }}
    />
  );
}
