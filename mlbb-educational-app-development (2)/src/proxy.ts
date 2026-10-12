import { NextResponse, type NextRequest } from 'next/server';

const LOCALES = ['en', 'fa'] as const;
type Locale = (typeof LOCALES)[number];

function detectLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get('nexus-locale')?.value;
  if (cookie === 'en' || cookie === 'fa') return cookie;
  const header = request.headers.get('accept-language') || '';
  return /^fa|,fa|fa-IR/i.test(header) ? 'fa' : 'en';
}

/** Adds the locale prefix (`/en`, `/fa`) to page URLs; API, assets and files pass through. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)))
    return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/${detectLocale(request)}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: [
    '/((?!api|_next|images|fonts|icon|apple-touch-icon|favicon|og-image|manifest|sw\\.js|robots|sitemap|.*\\..*).*)',
  ],
};
