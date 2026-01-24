import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { siteSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Retrieve all site settings
export async function GET() {
  try {
    const settings = await db.select().from(siteSettings);

    // Convert to object format
    const settingsObj: Record<string, string> = {};
    for (const setting of settings) {
      settingsObj[setting.key] = setting.value;
    }

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Failed to fetch site settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST - Update a site setting
export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    // Upsert the setting
    await db
      .insert(siteSettings)
      .values({ key, value: String(value), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: String(value), updatedAt: new Date() },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update site setting:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
