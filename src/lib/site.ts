/** Strip any scheme the value already carries, so one is never doubled up. */
function https(host: string): string {
  return `https://${host.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
}

/**
 * The one absolute origin the whole site agrees on.
 *
 * Three things need it and they must not disagree: the metadataBase behind og:image, the canonical
 * links Google dedupes on, and the URLs in robots.txt/sitemap.xml. If any of them named a different
 * host, Google would treat the same page under two addresses as two competing pages.
 *
 * The order matters, and the last Vercel entry is the one that earns its place:
 *
 * 1. NEXT_PUBLIC_SITE_URL — an explicit override, and the only way to name a custom domain.
 * 2. VERCEL_PROJECT_PRODUCTION_URL — the stable production host. Right for canonicals, because it
 *    stays the same on a preview deployment rather than letting a preview compete with production.
 * 3. VERCEL_URL — the deployment's own host. Not ideal for a canonical, but it guarantees we can
 *    never reach the localhost fallback while running on Vercel.
 * 4. localhost — dev only.
 *
 * Without step 3, a build where the production host happened to be unset would publish
 * "Host: http://localhost:3000" and a localhost sitemap to Google: a silent, actively harmful
 * failure that nothing else in the app would notice.
 */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? https(process.env.NEXT_PUBLIC_SITE_URL)
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? https(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : process.env.VERCEL_URL
      ? https(process.env.VERCEL_URL)
      : 'http://localhost:3000'
