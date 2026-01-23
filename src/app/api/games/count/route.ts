import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, crazyGames, wildeGames, zenGames, bangGames } from '@/lib/db/schema';
import { count } from 'drizzle-orm';

// GET /api/games/count - Get total number of games across all game types
export async function GET() {
  try {
    const [classicCount, crazyCount, wildeCount, zenCount, bangCount] = await Promise.all([
      db.select({ count: count() }).from(games),
      db.select({ count: count() }).from(crazyGames),
      db.select({ count: count() }).from(wildeGames),
      db.select({ count: count() }).from(zenGames),
      db.select({ count: count() }).from(bangGames),
    ]);

    const total =
      classicCount[0].count +
      crazyCount[0].count +
      wildeCount[0].count +
      zenCount[0].count +
      bangCount[0].count;

    return NextResponse.json({ count: total });
  } catch (error) {
    console.error('Error counting games:', error);
    return NextResponse.json({ count: 0 });
  }
}
