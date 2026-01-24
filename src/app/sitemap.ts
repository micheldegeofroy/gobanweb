import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://gobanweb.vercel.app';
  const lastModified = new Date();

  return [
    // Main landing page - highest priority
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Classic Go - original 2-player game
    {
      url: `${baseUrl}/classic`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // Tutorial - important for SEO and beginners
    {
      url: `${baseUrl}/tutorial`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // Wilde Go - multiplayer variant
    {
      url: `${baseUrl}/wilde`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Crazy Go - 4-player variant
    {
      url: `${baseUrl}/crazy`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Zen Go - 3-player variant
    {
      url: `${baseUrl}/zen`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Go Bang - war themed variant
    {
      url: `${baseUrl}/bang`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Domiio Go - branded variant
    {
      url: `${baseUrl}/dom`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // Legal pages
    {
      url: `${baseUrl}/legal/privacy-policy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms-of-service`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
