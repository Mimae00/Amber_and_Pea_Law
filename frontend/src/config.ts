/**
 * Runtime configuration from VITE_* environment variables (set at build time).
 */
function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. See frontend/.env.example.`);
  }
  return trimSlash(value);
}

export const config = {
  apiBaseUrl: required('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL),
  aiBaseUrl: trimSlash(import.meta.env.VITE_AI_BASE_URL ?? ''),
  siteUrl: trimSlash(import.meta.env.VITE_SITE_URL ?? window.location.origin),
} as const;
