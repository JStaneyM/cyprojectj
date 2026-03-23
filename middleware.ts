import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateBikeUrl } from '@/lib/utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const locales = ['en', 'de', 'fr', 'es', 'it', 'nl']
const defaultLocale = 'en'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow sitemap and robots routes to bypass locale redirects.
  if (
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/sitemaps/')
  ) {
    return NextResponse.next()
  }

  // Check if pathname is missing locale
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // 1. Handle Old URL pattern: /category/slug (2 segments)
  // Only check if missing locale
  if (pathnameIsMissingLocale) {
    const segments = pathname.split('/').filter(Boolean)

    // Filter out potential non-bike paths
    if (segments.length === 2 &&
      !pathname.startsWith('/admin') &&
      !pathname.startsWith('/api') &&
      !pathname.startsWith('/search') &&
      !pathname.startsWith('/_next') &&
      !pathname.includes('.')) {

      const slug = segments[1]

      try {
        const { data: bike } = await supabase
          .from('bikes')
          .select('category, sub_category, brand, year, model, slug')
          .eq('slug', slug)
          .single()

        if (bike) {
          // Redirect to new URL structure with default locale
          // generateBikeUrl returns relative path like /category/sub...
          // We prepend /en
          const bikeUrl = generateBikeUrl(bike)
          return NextResponse.redirect(new URL(`/${defaultLocale}${bikeUrl}`, request.url), { status: 301 })
        }
      } catch (e) {
        // Ignore error, proceed to locale redirect
      }
    }
  }

  // 2. Redirect if missing locale
  if (pathnameIsMissingLocale) {
    // Redirect to default locale
    return NextResponse.redirect(
      new URL(`/${defaultLocale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url)
    )
  }
}

export const config = {
  matcher: [
    // Skip all internal paths (_next) and API routes
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$|.*\\.webp$).*)',
  ],
}
