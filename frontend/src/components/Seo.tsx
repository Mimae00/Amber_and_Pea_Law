import { useLocation } from 'react-router-dom';
import { config } from '../config';
import { firm } from '../content/firm';

interface SeoProps {
  title: string;
  description: string;
  /** Set for pages that should not be indexed (admin, 404). */
  noIndex?: boolean;
}

/**
 * Per-page meta tags. React 19 hoists <title>, <meta> and <link> into <head>.
 */
export function Seo({ title, description, noIndex = false }: SeoProps) {
  const { pathname } = useLocation();
  const fullTitle = title === firm.name ? `${firm.name} | Sample Site` : `${title} | ${firm.name}`;
  const canonical = `${config.siteUrl}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={firm.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:card" content="summary" />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </>
  );
}
