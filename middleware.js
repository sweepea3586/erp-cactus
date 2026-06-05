import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api', '/_next', '/favicon.ico']

export function middleware(request) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }
  const session = request.cookies.get('cls_session')?.value
  if (!session && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
