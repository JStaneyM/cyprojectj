import { MetadataRoute } from 'next'
import { supabaseServer } from '@/lib/supabase'
import { formatCategoryForUrl, generateBikeUrl } from '@/lib/utils'
import { SITE_URL } from '@/lib/site'
export const revalidate = 86400 // Revalidate every 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: bikes } = await supabaseServer
    .from('bikes')
    .select('slug, category, sub_category, brand, updated_at')
    .order('updated_at', { ascending: false })

  if (!bikes) {
    return [
      {
        url: `${SITE_URL}/en`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
    ]
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
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    }
  })

  return [
    {
      url: `${SITE_URL}/en`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...categoryUrls,
    ...bikeUrls,
  ]
}
