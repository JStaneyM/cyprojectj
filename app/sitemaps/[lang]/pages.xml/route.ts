import { supabaseServer } from '@/lib/supabase'
import { buildUrlSetXml, toAbsoluteUrl, xmlResponse } from '@/lib/sitemaps'
import { formatCategoryForUrl, generateUrlSlug, SUPPORTED_LANGUAGES } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type ListingRow = {
  category: string
  sub_category: string | null
  brand: string
  updated_at: string
}

const STATIC_PATHS = ['', '/about', '/contact', '/privacy', '/terms', '/cookies', '/search', '/compare']

export async function GET(_: Request, context: { params: { lang: string } }) {
  const lang = SUPPORTED_LANGUAGES.includes(context.params.lang) ? context.params.lang : 'en'
  const now = new Date().toISOString()

  const { data: bikes } = await supabaseServer
    .from('bikes')
    .select('category, sub_category, brand, updated_at')
    .order('updated_at', { ascending: false })

  const categoryMap = new Map<string, string>()
  const subCategoryMap = new Map<string, string>()
  const brandMap = new Map<string, string>()

  ;(bikes as ListingRow[] | null)?.forEach((bike) => {
    const updatedAt = bike.updated_at ? new Date(bike.updated_at).toISOString() : now
    const categorySlug = `${formatCategoryForUrl(bike.category)}bikes`
    const subCategorySlug = bike.sub_category ? generateUrlSlug(bike.sub_category) : 'general'
    const brandSlug = generateUrlSlug(bike.brand)

    const categoryPath = `/${lang}/${categorySlug}`
    const subCategoryPath = `/${lang}/${categorySlug}/${subCategorySlug}`
    const brandPath = `/${lang}/${categorySlug}/${subCategorySlug}/${brandSlug}`

    if (!categoryMap.has(categoryPath) || categoryMap.get(categoryPath)! < updatedAt) {
      categoryMap.set(categoryPath, updatedAt)
    }

    if (!subCategoryMap.has(subCategoryPath) || subCategoryMap.get(subCategoryPath)! < updatedAt) {
      subCategoryMap.set(subCategoryPath, updatedAt)
    }

    if (!brandMap.has(brandPath) || brandMap.get(brandPath)! < updatedAt) {
      brandMap.set(brandPath, updatedAt)
    }
  })

  const urls = [
    ...STATIC_PATHS.map((path) => ({ loc: toAbsoluteUrl(`/${lang}${path}`), lastmod: now })),
    ...Array.from(categoryMap.entries()).map(([path, lastmod]) => ({ loc: toAbsoluteUrl(path), lastmod })),
    ...Array.from(subCategoryMap.entries()).map(([path, lastmod]) => ({ loc: toAbsoluteUrl(path), lastmod })),
    ...Array.from(brandMap.entries()).map(([path, lastmod]) => ({ loc: toAbsoluteUrl(path), lastmod })),
  ]

  return xmlResponse(buildUrlSetXml(urls))
}
