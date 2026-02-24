import { betterFetch } from '@better-fetch/fetch'
import type { Session } from 'better-auth/types'
import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard']

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (!protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const { data: session } = await betterFetch<Session>('/api/auth/get-session', {
    baseURL: request.nextUrl.origin,
    headers: {
      cookie: request.headers.get('cookie') || '',
    },
  })

  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
