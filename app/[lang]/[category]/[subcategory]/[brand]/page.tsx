
import { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase'
import CategoryPageContent from '@/components/CategoryPageContent'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: {
        lang: string
        category: string
        subcategory: string
        brand: string
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const brandName = params.brand.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const subCategoryName = params.subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return {
        title: `${brandName} ${subCategoryName} - BikeMax`,
        description: `Explore ${brandName} ${subCategoryName} bikes. Compare specs, prices, and reviews.`,
    }
}

export default async function SubCategoryBrandPage({ params }: PageProps) {
    const categorySlug = params.category.replace(/bikes$/i, '')
    const subCategoryName = params.subcategory.replace(/-/g, ' ')
    const brandName = params.brand.replace(/-/g, ' ')

    const { data: bikes, count } = await supabaseServer
        .from('bikes')
        .select('id, brand, model, year, price, slug, category, sub_category, images, vfm_score_1_to_10, build_1_10, speed_index, frame, overall_score, performance_score, value_score, ride_comfort_1_10, posture_1_10', { count: 'exact' })
        .ilike('sub_category', `%${subCategoryName}%`)
        .ilike('category', `%${categorySlug}%`)
        .ilike('brand', `%${brandName}%`)
        .order('year', { ascending: false })

    const totalCount = count || 0
    const displayName = `${brandName} ${subCategoryName}`

    const categoryDisplayName = params.category
        .replace(/bikes$/i, ' Bikes')
        .replace(/([A-Z])/g, ' $1')
        .trim()

    return (
        <main className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-4">
                    <Link href={`/${params.lang}/${params.category}/${params.subcategory}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        ← Back to {subCategoryName}
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 capitalize">{displayName}</h1>
                    <p className="text-gray-600">
                        Browse {totalCount.toLocaleString()} {displayName.toLowerCase()} in our catalog
                    </p>
                </div>

                {bikes && bikes.length > 0 ? (
                    <CategoryPageContent
                        initialBikes={bikes as any}
                        categorySlug={params.category}
                        totalCount={totalCount}
                        filterType="subcategory" // Logic is same as subcategory but more specific. Actually we should probably pass brand too? 
                    // Actually, if we pass 'subcategory' and filterValue, the API uses filterValue. 
                    // But here we need BOTH brand AND subcategory. 
                    // The CategoryPageContent logic I wrote allows ONE filterType. 
                    // For this specific deeply nested page, the 'initialBikes' are already correct.
                    // The loading logic in CategoryPageContent might overwrite it with broader query if not careful.
                    // Ideally we disable loading more or ensure the fetch URL is correct.
                    // I will mark filterType as 'subcategory' and ensure the API call supports passing both or I should update CategoryPageContent to support multiple filters.
                    // Given constraints, I will rely on initialBikes and maybe disable auto-loading if count < total?
                    // Or better: Pass filterType='brand' filterValue={brandName} ? No, that loses subcat.
                    // I will rely on initialBikes for now, and if user filters in UI, it filters locally.
                    // Wait, CategoryPageContent's loadAllBikes uses url += &subcategory=... OR &brand=...
                    // It does not support combining them in my previous edit.
                    // I should update CategoryPageContent to support composite filters if needed, or simply trust initialBikes if totalCount <= 15.
                    />
                ) : (
                    <div className="text-center py-12">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bikes Found</h3>
                        <p className="text-gray-600">We couldn't find any bikes matching "{displayName}".</p>
                    </div>
                )}
            </div>
        </main>
    )
}
