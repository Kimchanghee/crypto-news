/**
 * Per-article AI image generator.
 *
 * Three sources, in order of preference:
 *   1. OpenAI Images API with model `gpt-image-2` (production, runs in Vercel)
 *      → requires OPENAI_API_KEY
 *   2. codex-image CLI (https://github.com/wjb127/codex-image)
 *      → for local dev when OAuth-only ChatGPT account is preferred over an API key
 *      → only works on a host with `codex` installed and `codex login` completed
 *   3. Deterministic SVG placeholder (always works, fully offline)
 *
 * The function returns a public URL that the article pages can embed directly.
 * For #1 and #2 we upload the result to Vercel Blob (or KV-backed data URL fallback)
 * so the URL is shareable. The placeholder is returned as a data URI.
 */
import { createHash } from 'node:crypto';
import type { ArticleI18n } from './types';
import { channel } from '@/channel.config';

type ImageOpts = { width?: 1024 | 1536; height?: 1024 | 1536; quality?: 'low' | 'medium' | 'high' };

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const HAS_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const ENABLE_CODEX = process.env.ENABLE_CODEX_IMAGE === '1';

/** Build an evocative prompt from the article's title + summary + channel theme. */
export function buildPrompt(i: ArticleI18n): string {
  const accent = {
    blue: 'cool blue ink and slate gradient',
    orange: 'warm sunset orange and amber gradient',
    green: 'sage green and forest gradient'
  }[channel.accent as 'blue' | 'orange' | 'green'] ?? 'paper-warm tones';

  // Strip HTML tags from summary for the prompt
  const cleanSummary = (i.summary || i.title).replace(/<[^>]+>/g, '').slice(0, 200);

  return [
    `Editorial illustration for a finance/news article titled "${i.title}".`,
    `Subject hint: ${cleanSummary}.`,
    `Style: clean, modern editorial collage, soft paper texture, ${accent},`,
    `subtle data-viz motif (charts/lines/numbers fading in background),`,
    `cinematic depth, no text, no faces, no logos, no watermarks.`,
    `Aspect: news hero. Mood: thoughtful, trustworthy.`
  ].join(' ');
}

/**
 * Generate an image and return a public URL.
 * `id` is the article id — used as a stable filename for Vercel Blob.
 */
export async function generateImage(id: string, i: ArticleI18n, opts: ImageOpts = {}): Promise<string> {
  const width = opts.width ?? 1536;
  const height = opts.height ?? 1024;
  const quality = opts.quality ?? 'medium';
  const prompt = buildPrompt(i);

  // --- Path 1: OpenAI Images API (gpt-image-2) ---
  if (HAS_OPENAI) {
    try {
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-image-2',
          prompt,
          size: `${width}x${height}`,
          quality,
          n: 1
        })
      });
      if (r.ok) {
        const j = await r.json();
        const b64 = j.data?.[0]?.b64_json;
        const url = j.data?.[0]?.url;
        if (b64) return await persist(id, Buffer.from(b64, 'base64'));
        if (url) return url;
      } else {
        console.warn('[imagegen] openai failed', r.status, (await r.text()).slice(0, 200));
      }
    } catch (e) {
      console.warn('[imagegen] openai error', (e as Error).message);
    }
  }

  // --- Path 2: codex-image CLI (only meaningful on local dev hosts) ---
  if (ENABLE_CODEX && process.env.NODE_ENV !== 'production') {
    try {
      const { execSync } = await import('node:child_process');
      const outDir = '/tmp/codex-img';
      execSync(`mkdir -p ${outDir}`);
      const cmd = `codex exec --skip-git-repo-check 'image_gen prompt:${JSON.stringify(prompt)} size:${width}x${height} quality:${quality} out:${outDir}/${id}.png'`;
      execSync(cmd, { stdio: 'pipe', timeout: 120_000 });
      const buf = (await import('node:fs')).readFileSync(`${outDir}/${id}.png`);
      return await persist(id, buf);
    } catch (e) {
      console.warn('[imagegen] codex-image fallback failed', (e as Error).message);
    }
  }

  // --- Path 3: deterministic SVG placeholder (always works) ---
  return placeholderDataUri(id, i.title);
}

/**
 * Upload the image bytes to Vercel Blob and return a public URL.
 * Falls back to embedded data URI if Blob isn't configured.
 */
async function persist(id: string, buf: Buffer): Promise<string> {
  if (HAS_BLOB) {
    try {
      const { put } = await import('@vercel/blob');
      const { url } = await put(`${channel.id}/${id}.png`, buf, {
        access: 'public',
        contentType: 'image/png',
        addRandomSuffix: false
      });
      return url;
    } catch (e) {
      console.warn('[imagegen] blob put failed, falling back to data URI', (e as Error).message);
    }
  }
  return `data:image/png;base64,${buf.toString('base64')}`;
}

/** Tiny deterministic SVG so every article has at least *something* unique. */
function placeholderDataUri(id: string, title: string): string {
  const h = createHash('sha1').update(id).digest('hex');
  const palette = [
    ['#d97757', '#f3c4b1'],
    ['#6a9bcc', '#d6e6f5'],
    ['#788c5d', '#d8e3c8']
  ];
  const [c1, c2] = palette[parseInt(h.slice(0, 2), 16) % palette.length];
  const seed = parseInt(h.slice(2, 8), 16);
  const shapes = Array.from({ length: 6 }, (_, k) => {
    const x = (seed >> (k * 3)) % 1500;
    const y = (seed >> (k * 5)) % 800;
    const r = 60 + ((seed >> (k * 7)) % 220);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${k % 2 ? c2 : c1}" opacity="0.${5 + (k % 4)}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024"><rect width="1536" height="1024" fill="#faf9f5"/>${shapes}<text x="60" y="960" font-family="Poppins,sans-serif" font-size="32" fill="#141413" opacity="0.6">${escapeXml(title.slice(0, 80))}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
