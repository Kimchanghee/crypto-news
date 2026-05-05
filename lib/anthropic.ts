/**
 * Article rewriting + 11-language translation using Anthropic Claude API.
 *
 * One call per article: model receives raw title + URL + channel context, returns
 * a JSON object with all 11 locales already filled in. After rewriting we kick off
 * a per-article image generation so every article has its own unique illustration.
 *
 * NOTE: requires `ANTHROPIC_API_KEY`. Falls back to a deterministic stub if missing
 * so `npm run dev` works without keys.
 */
import Anthropic from '@anthropic-ai/sdk';
import { locales, type Locale } from '@/i18n';
import { channel } from '@/channel.config';
import type { ArticleI18n, GeneratedArticle, SourceItem } from './types';
import { generateImage } from './imagegen';

const HAS_KEY = !!process.env.ANTHROPIC_API_KEY;
const client = HAS_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';

/**
 * Article shape. Aim is "long enough to rank in SEO + actually informative,
 * but still readable by a curious 11-year-old."
 *
 *   - title              ≤ 70 chars
 *   - metaDescription    ≤ 160 chars
 *   - summary            one sentence ≤ 110 chars (TL;DR card)
 *   - bodyHtml           650–950 words (~5–10 minute read)
 *                        sections: lead → "What happened" → "Why it matters" →
 *                        "How it affects you" → optional "What's next" → closing
 *   - faq                4 Q&A pairs
 *   - keywords           6–10
 *   - readingTime        integer minutes (auto-derived from word count)
 */
const SYSTEM = `You are a senior news rewriter for an ad-supported finance/news network.
You write in the voice of a kind teacher explaining current events to a curious 11-year-old —
warm, plain words, but never childish or hand-wavy.
Output rules:
- Always JSON. No markdown fences, no commentary.
- Each locale must include: title (≤ 70 chars), metaDescription (≤ 160 chars),
  summary (one sentence ≤ 110 chars), bodyHtml, faq (4 Q&A pairs),
  keywords (6–10), readingTime (integer minutes).
- bodyHtml is the heart of the article. Length: 650–950 words. Structure:
    1. Opening paragraph (3–5 sentences) — set the scene, lead with the most
       important fact, define one or two terms inline.
    2. <h2>What happened?</h2> — concrete details, numbers, who/when/where.
    3. <h2>Why does this matter?</h2> — explain stakes for ordinary people,
       use a relatable analogy.
    4. <h2>How might it affect you?</h2> — bullet list of practical implications.
    5. (Optional) <h2>What comes next?</h2> — likely follow-on events to watch.
    6. <h2>The takeaway</h2> — 2–3 sentences summarizing the key learning.
- Allowed HTML: <p>,<h2>,<h3>,<ul>,<li>,<ol>,<strong>,<em>,<a>,<blockquote>.
  No images, no scripts. Use exactly one <ul> in section 4.
- Define jargon inline the first time you use it (e.g., "CPI (the price index)").
- AEO: phrase H2s as questions a real reader would search.
- GEO: when the topic is Korea-relevant, mention KR-specific context for ko;
  for other locales, adapt to that audience naturally.
- Never invent facts not implied by the source. If unsure, hedge with
  "according to {source}" and link the source URL once near the end.
- Brand-safe: no profanity, no political endorsements, no medical advice.`;

const buildUserPrompt = (item: SourceItem) => `CHANNEL: ${channel.name} (${channel.id})
TAGLINE: ${channel.tagline}
KEYWORDS: ${channel.keywords.join(', ')}
CATEGORY: ${item.category}
SOURCE: ${item.sourceName}
SOURCE_URL: ${item.sourceUrl}
PUBLISHED: ${item.publishedAt}
ORIGINAL_TITLE: ${item.rawTitle}

Rewrite this story for ALL the locales below. Each locale must hit the 650–950 word target;
do not pad with filler — instead, broaden the explanation, add one concrete example,
and keep an even rhythm of short and medium sentences.

Return a single JSON object:
{
  "i18n": {
    ${locales.map((l) => `"${l}": {"title": "...", "metaDescription": "...", "summary": "...", "bodyHtml": "...", "faq": [{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}], "keywords": ["..."], "readingTime": 6}`).join(',\n    ')}
  },
  "slug": "<kebab-case english slug, ≤ 60 chars>",
  "imagePrompt": "<one English sentence describing a strong editorial illustration for this article>"
}`;

export async function rewriteAndTranslate(item: SourceItem): Promise<GeneratedArticle> {
  let i18n: Partial<Record<Locale, ArticleI18n>> = {};
  let slug = '';

  if (!client) {
    // Stub fallback for local dev w/o API key
    const ko: ArticleI18n = {
      title: item.rawTitle.slice(0, 70),
      metaDescription: `${item.rawTitle.slice(0, 130)}…`,
      summary: '핵심만 짧게 요약한 내용입니다.',
      bodyHtml: longStubBody(item),
      faq: [
        { q: '이 뉴스의 핵심은?', a: '한 줄로 정리한 답변입니다.' },
        { q: '내 자산에 영향이 있을까?', a: '단기 영향은 제한적이지만 중장기 흐름은 살펴볼 만해요.' },
        { q: '관련해서 무엇을 더 볼까요?', a: '같은 카테고리의 최신 분석을 함께 보세요.' },
        { q: '언제 다시 점검해야 할까요?', a: '다음 주요 지표 발표일 전후로 다시 살펴보면 좋습니다.' }
      ],
      keywords: [...channel.keywords, item.category],
      readingTime: 7
    };
    i18n.ko = ko;
    for (const l of locales) if (l !== 'ko') i18n[l] = { ...ko, title: `[${l}] ${ko.title}` };
    slug = item.id;
  } else {
    const r = await client.messages.create({
      model: MODEL,
      max_tokens: 8192, // longer to fit 11 locales × ~900 words
      system: SYSTEM,
      messages: [{ role: 'user', content: buildUserPrompt(item) }]
    });
    const text = r.content.filter((b) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    i18n = parsed.i18n;
    slug = parsed.slug || item.id;
  }

  // Generate a unique image per article (uses Korean version as the prompt seed)
  let imageUrl: string | undefined;
  try {
    imageUrl = await generateImage(item.id, i18n.ko ?? Object.values(i18n)[0]!);
  } catch (e) {
    console.warn('[imagegen] failed, article will fall back to placeholder', (e as Error).message);
  }

  const now = new Date().toISOString();
  return {
    id: item.id,
    slug,
    channelId: item.channelId,
    category: item.category,
    publishedAt: item.publishedAt,
    updatedAt: now,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    i18n,
    imageUrl
  };
}

function longStubBody(item: SourceItem): string {
  return `
<p>${escapeHtml(item.rawTitle)}.</p>
<h2>무슨 일이 일어났나요?</h2>
<p>이 단락은 ${item.sourceName} 출처의 뉴스를 평이한 말로 풀어 설명합니다. 실제 환경에서는 Claude API가 이 자리를 600자 이상의 본문으로 채워 줍니다.</p>
<h2>왜 중요할까요?</h2>
<p>이 뉴스는 우리 일상의 돈 흐름과 닿아 있어요. 작은 변화가 큰 결정으로 이어질 수 있는 이유를 차근차근 설명합니다.</p>
<h2>나에게 어떤 영향이 있을까요?</h2>
<ul>
  <li>지금 당장의 영향: 일상에서 체감할 수 있는 부분</li>
  <li>단기 흐름: 다음 한 달 안에 살펴볼 지표</li>
  <li>중장기 시사점: 자산 배분에 줄 수 있는 신호</li>
</ul>
<h2>다음에 무엇을 봐야 할까요?</h2>
<p>관련 지표, 정책 발표, 시장 반응을 함께 추적하면 좋습니다.</p>
<h2>핵심 정리</h2>
<p>출처: <a href="${item.sourceUrl}" rel="noopener">${item.sourceName}</a>. 자세한 원문은 출처에서 확인하세요.</p>
`.trim();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
