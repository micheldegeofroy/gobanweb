import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { legalPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LegalPageProps) {
  const { slug } = await params;

  try {
    const page = await db
      .select()
      .from(legalPages)
      .where(eq(legalPages.slug, slug))
      .limit(1);

    if (page.length === 0) {
      return { title: 'Page Not Found' };
    }

    return {
      title: page[0].title,
      description: `${page[0].title} - Goban Web`,
    };
  } catch {
    return { title: 'Legal' };
  }
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;

  let page;
  try {
    const result = await db
      .select()
      .from(legalPages)
      .where(eq(legalPages.slug, slug))
      .limit(1);

    if (result.length === 0) {
      notFound();
    }

    page = result[0];
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-amber-600 dark:text-amber-400 hover:underline mb-4 inline-block"
          >
            ← Back to Goban Web
          </Link>
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
            {page.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Last updated: {new Date(page.updatedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8">
          <div
            className="prose prose-zinc dark:prose-invert max-w-none font-[family-name:var(--font-geist-sans)]"
            style={{ lineHeight: '1.6' }}
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="hover:underline">
            Goban Web
          </Link>
          {' · '}
          <Link href="/legal/terms" className="hover:underline">
            Terms
          </Link>
          {' · '}
          <Link href="/legal/privacy" className="hover:underline">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  );
}
