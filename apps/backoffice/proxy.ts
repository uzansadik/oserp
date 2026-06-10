import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'bo_session';

const PUBLIC_PATHS = new Set<string>(['/login', '/setup']);
const PUBLIC_API_PREFIXES = ['/api/login', '/api/setup', '/api/health'];

/**
 * Reverse proxy (Caddy) arkasında çalışırken, `request.nextUrl.protocol`
 * her zaman "http" döner çünkü Next.js içeride HTTP konuşur. Cookie'nin
 * Secure olarak set edilip edilmeyeceğine karar vermek için proxy'nin
 * bize söylediği orijinal protokolü kullanıyoruz.
 */
function forwardedProto(request: NextRequest): 'http' | 'https' {
  const xfp = request.headers.get('x-forwarded-proto');
  if (xfp) {
    const first = xfp.split(',')[0]?.trim().toLowerCase();
    if (first === 'https') return 'https';
    if (first === 'http') return 'http';
  }
  return request.nextUrl.protocol.replace(':', '') === 'https' ? 'https' : 'http';
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && token.length > 0) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  // Forwarded proto'yu koru ki login sonrası redirect doğru origin'e gitsin.
  if (forwardedProto(request) === 'https') {
    url.protocol = 'https:';
  } else {
    url.protocol = 'http:';
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|gif|ico|webp|css|js)$).*)',
  ],
};
