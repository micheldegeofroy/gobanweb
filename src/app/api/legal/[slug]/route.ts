import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { legalPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/legal/[slug] - Get a legal page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const page = await db
      .select()
      .from(legalPages)
      .where(eq(legalPages.slug, slug))
      .limit(1);

    if (page.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json(page[0]);
  } catch (error) {
    console.error('Error fetching legal page:', error);
    return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 });
  }
}

// PUT /api/legal/[slug] - Create or update a legal page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { title, content } = body;

    if (typeof title !== 'string' || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Upsert the page
    await db
      .insert(legalPages)
      .values({
        slug,
        title,
        content,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: legalPages.slug,
        set: {
          title,
          content,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Error saving legal page:', error);
    return NextResponse.json({ error: 'Failed to save page' }, { status: 500 });
  }
}
