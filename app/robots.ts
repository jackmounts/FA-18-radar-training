import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL;
  return { rules: { userAgent: '*', allow: '/' }, sitemap: site ? new URL('/sitemap.xml', site).href : undefined };
}
