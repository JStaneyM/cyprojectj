import { getDictionary } from '@/lib/dictionaries'
import { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase'
import CategoryPageContent from '@/components/CategoryPageContent'
import BikeDetailView from '@/components/BikeDetailView'
import Link from 'next/link'
import { generateUrlSlug, formatCategoryForUrl, getMetadataAlternates } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: {
        lang: string
        category: string
        subcategory: string
    }
}

async function getBikeBySlug(slug: string) {
    const { data } = await supabaseServer
        .from('bikes')
        .select('*')
        .eq('slug', slug)
        .single()
    return data
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    // 1. Check if it's a bike
    const bike = await getBikeBySlug(params.subcategory)
    if (bike) {
        // If it's a bike details page accessed via this route (not typical if using deep route, but handled here)
        // We probably should redirect or handle canonical to the deep URL ideally, but let's stick to current URL for now
        // OR use the bike's deep URL as canonical? The prompting implied "each URL should have its own version".
        // The user said: "For all language variants of a bike, the Hreflang section would remain exactly the same but the canonical line will change to itself."
        // So for THIS URL, canonical is THIS URL.

        const alternates = getMetadataAlternates(`/${params.category}/${params.subcategory}`, params.lang)

        return {
            title: bike.title_seo || `${bike.brand} ${bike.model} ${bike.year || ''} - Specs & Review`,
            description: bike.meta_desc || '',
            alternates
        }
    }

    // 2. Fallback to Subcategory/Brand metadata logic
    const displayName = params.subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const categoryName = params.category.replace(/bikes$/i, ' Bikes').replace(/([A-Z])/g, ' $1').trim()

    const alternates = getMetadataAlternates(`/${params.category}/${params.subcategory}`, params.lang)

    return {
        title: `${displayName} - ${categoryName} | BikeMax`,
        description: `Explore our collection of ${displayName} ${categoryName}. Compare specs, prices, and reviews.`,
        alternates
    }
}

export default async function SubCategoryPage({ params }: PageProps) {
    // 1. Try matching as a specific Bike (Product Page)
    const bike = await getBikeBySlug(params.subcategory)

    if (bike) {
        const dict = await getDictionary(params.lang)
        return <BikeDetailView bike={bike} lang={params.lang} dict={dict} />
    }

    // 2. If not a bike, proceed with Sub-Category / Brand logic
    const slug = params.subcategory
    const categorySlug = params.category.replace(/bikes$/i, '')

    // Try matching as a sub_category first
    // improved logic: handle hyphens by trying both space replacement and wildcard
    const subCategoryName = slug.replace(/-/g, ' ')
    const subCategoryWildcard = slug.replace(/-/g, '%')

    const { data: subCatBikes, count: subCatCount } = await supabaseServer
        .from('bikes')
        .select('id, brand, model, year, price, slug, category, sub_category, images, vfm_score_1_to_10, build_1_10, speed_index, frame, overall_score, performance_score, value_score, ride_comfort_1_10, posture_1_10', { count: 'exact' })
        .or(`sub_category.ilike.%${subCategoryName}%,sub_category.ilike.%${subCategoryWildcard}%`)
        .ilike('category', `%${categorySlug}%`)
        .order('year', { ascending: false })
        .limit(50) // Explicit limit to ensure we get enough bikes

    let bikes = subCatBikes
    let totalCount = subCatCount || 0
    let type = 'subcategory'
    let displayName = subCategoryName

    // If no sub-category matches, try matching as a brand within this category
    if (!bikes || bikes.length === 0) {
        const brandName = slug.replace(/-/g, ' ')
        const { data: brandBikes, count: brandCount } = await supabaseServer
            .from('bikes')
            .select('id, brand, model, year, price, slug, category, sub_category, images, vfm_score_1_to_10, build_1_10, speed_index, frame, overall_score, performance_score, value_score, ride_comfort_1_10, posture_1_10', { count: 'exact' })
            .ilike('brand', brandName)
            .ilike('category', `%${categorySlug}%`)
            .order('year', { ascending: false })

        if (brandBikes && brandBikes.length > 0) {
            bikes = brandBikes
            totalCount = brandCount || 0
            type = 'brand'
            displayName = brandName
        }
    }

    // Helper to format category name nicely
    const formatCategoryName = (slug: string) => {
        if (slug.includes('road')) return 'Road E-Bikes' // Based on DB 'E-bikeRoad'
        if (slug.includes('mountain') || slug.includes('mtb')) return 'Mountain E-Bikes'
        return slug.replace(/bikes$/i, ' Bikes').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const categoryDisplayName = formatCategoryName(params.category)

    // Detect "Top X" pages
    let initialSortBy = 'newest'

    if (params.subcategory.startsWith('top-')) {
        const isValue = params.subcategory.includes('value')

        const { data: topBikes, count: topCount } = await supabaseServer
            .from('bikes')
            .select('id, brand, model, year, price, slug, category, sub_category, images, vfm_score_1_to_10, build_1_10, speed_index, frame, overall_score, value_score, performance_score, ride_comfort_1_10, posture_1_10', { count: 'exact' })
            .ilike('category', `%${categorySlug}%`)
            .order(isValue ? 'value_score' : 'overall_score', { ascending: false })
            .limit(50)

        if (topBikes && topBikes.length > 0) {
            bikes = topBikes
            totalCount = topCount || 0
            type = 'top-list'
            // Set displayName to be the FULL title, so we don't append categoryDisplayName later
            displayName = isValue ? `Top Value ${categoryDisplayName}` : `Top Rated ${categoryDisplayName}`
            // If it's performance
            if (params.subcategory.includes('performance')) displayName = `Top Performance ${categoryDisplayName}`

            initialSortBy = 'score'

            // Override categoryDisplayName to empty string for this view to avoid duplication in H1
            // OR handle it in the return statement
        }
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-4">
                    <Link href={`/${params.lang}/${params.category}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        ← Back to {categoryDisplayName}
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        {type === 'top-list' ? displayName : `${displayName} ${categoryDisplayName}`}
                    </h1>
                    <p className="text-gray-600">
                        Browse {totalCount.toLocaleString()} {displayName.toLowerCase()} {categoryDisplayName.toLowerCase()} in our catalog
                    </p>
                </div>

                {bikes && bikes.length > 0 ? (
                    <CategoryPageContent
                        initialBikes={bikes as any}
                        categorySlug={params.category}
                        totalCount={totalCount}
                        filterType={type as any}
                        filterValue={displayName}
                        initialSortBy={initialSortBy}
                    />
                ) : (
                    <div className="text-center py-12">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bikes Found</h3>
                        <p className="text-gray-600">We couldn't find any bikes matching "{displayName}" in this category.</p>
                    </div>
                )}
            </div>
        </main>
    )
}
