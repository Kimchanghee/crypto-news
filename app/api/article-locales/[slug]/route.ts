import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { articleLocales } from '@/lib/article-locale';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const article = await db.getBySlug(params.slug);
  if (!article) return NextResponse.json({ locales: [] }, { status: 404 });
  return NextResponse.json({ locales: articleLocales(article) });
}
