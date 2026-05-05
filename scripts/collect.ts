import 'dotenv/config';
import { fetchAllSources, dedupeByTitle } from '../lib/rss';
import { rewriteAndTranslate } from '../lib/anthropic';
import { db } from '../lib/db';
import { channel } from '../channel.config';

(async () => {
  const fetched = await fetchAllSources(channel.id);
  console.log(`fetched: ${fetched.length}`);
  const fresh = [];
  for (const i of dedupeByTitle(fetched)) {
    if (await db.hasSeen(i.id)) continue;
    fresh.push(i);
    if (fresh.length >= 3) break;
  }
  for (const f of fresh) {
    const a = await rewriteAndTranslate(f);
    await db.putArticle(a);
    await db.markSeen([f]);
    console.log('saved', a.slug);
  }
})();
