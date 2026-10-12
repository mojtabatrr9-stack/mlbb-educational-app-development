import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const now = new Date();
  return ['en', 'fa'].map((locale) => ({
    url: `${base}/${locale}`,
    lastModified: now,
    alternates: { languages: { en: `${base}/en`, fa: `${base}/fa` } },
  }));
}
