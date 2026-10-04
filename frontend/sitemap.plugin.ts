import type { Plugin } from 'vite';

/**
 * Generates sitemap.xml and robots.txt from VITE_SITE_URL.
 * Dynamic pages (practice areas, attorneys) are fetched from the API at build time
 * when it is reachable; otherwise only the static routes are listed.
 */
const STATIC_ROUTES = [
  '/',
  '/practice-areas',
  '/attorneys',
  '/reviews',
  '/book',
  '/contact',
  '/disclaimer',
  '/privacy',
];

interface Options {
  siteUrl: string;
  apiUrl: string;
}

async function fetchSlugs(apiUrl: string, path: string): Promise<string[]> {
  if (!apiUrl) return [];
  try {
    const res = await fetch(`${apiUrl}${path}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ slug?: unknown }>;
    return data.map((d) => d.slug).filter((s): s is string => typeof s === 'string');
  } catch {
    return [];
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function buildSitemap({ siteUrl, apiUrl }: Options): Promise<string> {
  const [areas, attorneys] = await Promise.all([
    fetchSlugs(apiUrl, '/api/practice-areas'),
    fetchSlugs(apiUrl, '/api/attorneys'),
  ]);
  const routes = [
    ...STATIC_ROUTES,
    ...areas.map((s) => `/practice-areas/${encodeURIComponent(s)}`),
    ...attorneys.map((s) => `/attorneys/${encodeURIComponent(s)}`),
  ];
  const urls = routes
    .map((r) => `  <url><loc>${escapeXml(siteUrl + r)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildRobots(siteUrl: string): string {
  return `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

export function sitemapPlugin(options: Options): Plugin {
  return {
    name: 'amber-pea-sitemap',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/sitemap.xml') {
          res.setHeader('Content-Type', 'application/xml');
          res.end(await buildSitemap(options));
          return;
        }
        if (req.url === '/robots.txt') {
          res.setHeader('Content-Type', 'text/plain');
          res.end(buildRobots(options.siteUrl));
          return;
        }
        next();
      });
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: await buildSitemap(options) });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobots(options.siteUrl) });
    },
  };
}
