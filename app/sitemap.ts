import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

// One page; the list stays empty when the build has no public origin to put in absolute URLs
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.SITE_URL;
  return site ? [{ url: new URL('/', site).href }] : [];
}
