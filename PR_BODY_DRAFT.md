## Summary

This PR improves the app's SEO foundation and fixes build-time reliability issues that were blocking static generation.

## Changes included

### SEO
- richer page metadata (`title`, description, canonical, Open Graph, Twitter)
- `robots.txt` generation via `src/app/robots.ts`
- `sitemap.xml` generation via `src/app/sitemap.ts`
- JSON-LD structured data for `Organization`, `WebApplication`, and `FAQPage`
- stronger semantic landing-page content and anchors for crawlability

### Reliability / build fixes
- defer `MONGODB_URI` validation until runtime in `src/lib/mongodb.ts`
- remove build-time Clerk dependency from the root layout/page rendering path so the project can build without Clerk keys during static generation

## Validation
- `npm install`
- `npm run build` ✅

## Files changed
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/lib/mongodb.ts`

## Notes
This PR focuses on the most concrete, low-risk subset of issue #14 that could be implemented and verified locally right now: SEO improvements plus report-app build hardening.
