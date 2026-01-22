import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { legalPages } from '@/lib/db/schema';

// GET /api/legal - List all legal pages
export async function GET() {
  try {
    const pages = await db
      .select({
        slug: legalPages.slug,
        title: legalPages.title,
        updatedAt: legalPages.updatedAt,
      })
      .from(legalPages)
      .orderBy(legalPages.title);

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching legal pages:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}
