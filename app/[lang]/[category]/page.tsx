import { Metadata } from 'next'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase'
import { getMetadataAlternates } from '@/lib/utils'
import CategoryPageContent from '@/components/CategoryPageContent'

// Force dynamic rendering - always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: {
    category: string
    lang: string
  }
}

// Generate static params for categories
export async function generateStaticParams() {
  const { data: bikes } = await supabaseServer
    .from('bikes')
    .select('category')

  if (!bikes) return []

  const uniqueCategories = Array.from(new Set(bikes.map(b => b.category)))

  return uniqueCategories.map((category) => ({
    category: category.toLowerCase().replace(/\s+/g, ''),
  }))
}

// Generate metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const categoryName = params.category
    .replace(/bikes$/i, ' Bikes')
    .replace(/([A-Z])/g, ' $1')
    .trim()

  const alternates = getMetadataAlternates(`/${params.category}`, params.lang)

  return {
    title: `${categoryName} - BikeMax Catalog`,
    description: `Browse our extensive collection of ${categoryName.toLowerCase()}. Find detailed specs, performance metrics, and reviews.`,
    alternates
  }
}

const INITIAL_LOAD = 50

async function getInitialBikes(slug: string) {
  // 1. Try matching as a category first
  const categoryName = slug.replace(/bikes$/i, '').trim()

  const { data: categoryData, count: categoryCount } = await supabaseServer
    .from('bikes')
    .select('id, brand, model, year, price, slug, category, sub_category, images, vfm_score_1_to_10, build_1_10, speed_index, frame, overall_score, performance_score, value_score, ride_comfort_1_10, posture_1_10', { count: 'exact' })
    .ilike('category', `%${categoryName}%`)
    .order('year', { ascending: false })
    .limit(INITIAL_LOAD)

  if (categoryData && categoryData.length > 0) {
    return { bikes: categoryData, totalCount: categoryCount ?? 0, type: 'category' }
  }

  // 2. Try matching as a brand
  const brandName = slug.replace(/-/g, ' ')
  const { data: brandData, count: brandCount } = await supabaseServer
    .from('bikes')
    .select('id, brand, model, year, price, slug, category, sub_category, images, vfm_score_1_to_10, build_1_10, speed_index, frame, overall_score', { count: 'exact' })
    .ilike('brand', `%${brandName}%`)
    .order('year', { ascending: false })
    .limit(INITIAL_LOAD)

  return {
    bikes: brandData || [],
    totalCount: brandCount ?? 0,
    type: brandData && brandData.length > 0 ? 'brand' : 'none'
  }
}

import { getDictionary } from '@/lib/dictionaries'

// ... imports

export default async function CategoryPage({ params }: PageProps) {
  const { bikes, totalCount, type } = await getInitialBikes(params.category)
  const dict = await getDictionary(params.lang as any) // Type check might fail if lang is not typed

  const displayName = type === 'brand'
    ? params.category.replace(/-/g, ' ')
    : params.category.replace(/bikes$/i, ' Bikes').replace(/([A-Z])/g, ' $1').trim()

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href={`/${params.lang}`} className="text-blue-600 hover:text-blue-700 font-medium">
            ← {dict.common.back_to_home}
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">

        {bikes && bikes.length > 0 ? (
          <CategoryPageContent
            initialBikes={bikes as any}
            categorySlug={type === 'brand' ? params.category : params.category}
            totalCount={totalCount}
            filterType={type === 'brand' ? 'brand' : 'category'}
            dict={dict}
          />
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{dict.compare_page.no_bikes}</h3>
            <p className="text-gray-600">We couldn't find any bikes matching "{displayName}".</p>
          </div>
        )}
      </div>
    </main>
  )
}
