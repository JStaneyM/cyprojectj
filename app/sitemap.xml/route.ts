import { SITE_URL } from '@/lib/site'
import { SUPPORTED_LANGUAGES } from '@/lib/utils'
import { buildSitemapIndexXml, xmlResponse } from '@/lib/sitemaps'

export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date().toISOString()
  const urls = SUPPORTED_LANGUAGES.flatMap((lang) => [
    { loc: `${SITE_URL}/sitemaps/${lang}/pages.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemaps/${lang}/bikes.xml`, lastmod: now },
  ])

  return xmlResponse(buildSitemapIndexXml(urls))
}
