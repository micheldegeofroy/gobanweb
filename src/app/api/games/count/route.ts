import { NextResponse } from 'next/server';
import { db, games } from '@/lib/db';
import { count } from 'drizzle-orm';

// GET /api/games/count - Get total number of games
export async function GET() {
  try {
    const result = await db
      .select({ count: count() })
      .from(games);

    return NextResponse.json({ count: result[0].count });
  } catch (error) {
    console.error('Error counting games:', error);
    return NextResponse.json({ count: 0 });
  }
}
