import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(), // <title> (50–60 chars)
    h1: z.string(),
    description: z.string(), // 150–160 chars
    kicker: z.string(),
    question: z.string(),
    answer: z.string(), // direct answer, ~40 words, rendered first
    data_asof: z.string(),
    published: z.string(),
    updated: z.string(),
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })).min(1),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

export const collections = { guides };
