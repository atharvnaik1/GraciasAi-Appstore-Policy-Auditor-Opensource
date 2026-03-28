import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://opensource.gracias.sh/sitemap.xml',
    host: 'https://opensource.gracias.sh',
  };
}
