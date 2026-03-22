import { MetadataRoute } from 'next'
import { supabaseServer } from '@/lib/supabase'
import { formatCategoryForUrl, generateBikeUrl, generateUrlSlug } from '@/lib/utils'
import { SITE_URL, STATIC_SITE_LANGUAGES } from '@/lib/site'

export const revalidate = 86400 // Revalidate every 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticPaths = ['', '/about', '/contact', '/privacy', '/terms', '/cookies']
  const staticUrls: MetadataRoute.Sitemap = STATIC_SITE_LANGUAGES.flatMap((lang) =>
    staticPaths.map((path) => ({
      url: `${SITE_URL}/${lang}${path}`,
      lastModified: now,
      changeFrequency: path === '' ? 'daily' : 'monthly',
      priority: path === '' ? 1 : 0.6,
    }))
  )

  // Fetch all bikes from database
  const { data: bikes } = await supabaseServer
    .from('bikes')
    .select('slug, category, sub_category, brand, updated_at')
    .order('updated_at', { ascending: false })

  if (!bikes) {
    return staticUrls
  }

  const bikeUrls: MetadataRoute.Sitemap = bikes.map((bike) => {
    return {
      url: `${SITE_URL}${generateBikeUrl(bike, 'en')}`,
      lastModified: new Date(bike.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }
  })

  const categoryUrls: MetadataRoute.Sitemap = Array.from(new Set(bikes.map((bike) => bike.category))).map((category) => {
    const categorySlug = `${formatCategoryForUrl(category)}bikes`
    return {
      url: `${SITE_URL}/en/${categorySlug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    }
  })

  const subCategoryUrls: MetadataRoute.Sitemap = Array.from(
    new Set(
      bikes.map((bike) => {
        const categorySlug = `${formatCategoryForUrl(bike.category)}bikes`
        const subCategorySlug = bike.sub_category ? generateUrlSlug(bike.sub_category) : 'general'
        return `${categorySlug}/${subCategorySlug}`
      })
    )
  ).map((path) => ({
    url: `${SITE_URL}/en/${path}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const brandUrls: MetadataRoute.Sitemap = Array.from(
    new Set(
      bikes.map((bike) => {
        const categorySlug = `${formatCategoryForUrl(bike.category)}bikes`
        const subCategorySlug = bike.sub_category ? generateUrlSlug(bike.sub_category) : 'general'
        const brandSlug = generateUrlSlug(bike.brand)
        return `${categorySlug}/${subCategorySlug}/${brandSlug}`
      })
    )
  ).map((path) => ({
    url: `${SITE_URL}/en/${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const dedupedUrls = new Map(
    [...staticUrls, ...categoryUrls, ...subCategoryUrls, ...brandUrls, ...bikeUrls].map((entry) => [
      entry.url,
      entry,
    ])
  )

  return Array.from(dedupedUrls.values())
}
