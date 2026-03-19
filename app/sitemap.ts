import { MetadataRoute } from 'next'
import { supabaseServer } from '@/lib/supabase'
import { generateBikeUrl } from '@/lib/utils'

export const revalidate = 86400 // Revalidate every 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Fetch all bikes from database
  const { data: bikes } = await supabaseServer
    .from('bikes')
    .select('slug, category, sub_category, brand, updated_at')
    .order('updated_at', { ascending: false })

  if (!bikes) {
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
    ]
  }

  // Create sitemap entries for each bike
  const bikeUrls: MetadataRoute.Sitemap = bikes.map((bike) => {
    return {
      url: `${baseUrl}${generateBikeUrl(bike, 'en')}`,
      lastModified: new Date(bike.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }
  })

  // Get unique categories
  const categories = Array.from(new Set(bikes.map((b) => b.category)))
  const categoryUrls: MetadataRoute.Sitemap = categories.map((category) => {
    const categorySlug = category.toLowerCase().replace(/\s+/g, '')
    return {
      url: `${baseUrl}/en/${categorySlug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    }
  })

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...categoryUrls,
    ...bikeUrls,
  ]
}
