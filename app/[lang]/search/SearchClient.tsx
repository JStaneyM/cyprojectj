'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import BikeCard from '@/components/BikeCard'

interface SearchBike {
    id: number
    brand: string
    model: string
    year: number | null
    price: number | null
    slug: string
    category: string
    sub_category: string | null
    primary_image: string | null
    vfm_score_1_to_10: number | null
    build_1_10: number | null
    speed_index: number | null
    ride_comfort_1_10: number | null
    frame?: string | null
    performance_score?: number | null
    value_score?: number | null
    posture_1_10?: number | null
}

interface SearchClientProps {
    dict: any
    lang: string
}

export default function SearchClient({ dict, lang }: SearchClientProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const query = searchParams.get('q')
    const [results, setResults] = useState<SearchBike[]>([])
    const [filteredResults, setFilteredResults] = useState<SearchBike[]>([])
    const [loading, setLoading] = useState(false)
    const [searchInput, setSearchInput] = useState(query || '')

    // Filter states
    const [selectedSubCategory, setSelectedSubCategory] = useState<string>('')
    const [selectedBrand, setSelectedBrand] = useState<string>('')
    const [selectedFrame, setSelectedFrame] = useState<string>('')
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000])
    const [sortBy, setSortBy] = useState<string>('newest')
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

    // Display state
    const [displayCount, setDisplayCount] = useState(15)

    useEffect(() => {
        if (query && query.trim().length >= 2) {
            setLoading(true)
            // Fetch all matching results, then filter client-side
            fetch(`/api/search?q=${encodeURIComponent(query)}&limit=100`)
                .then(res => res.json())
                .then(data => {
                    setResults(data.bikes || [])
                    setFilteredResults(data.bikes || [])
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false))
        } else {
            setResults([])
            setFilteredResults([])
        }
    }, [query])

    // Get unique filter values from results
    const brands = useMemo(() => Array.from(new Set(results.map(b => b.brand))).sort(), [results])
    const subCategories = useMemo(() => Array.from(new Set(results.map(b => b.sub_category).filter(Boolean))).sort(), [results])
    const frames = useMemo(() => Array.from(new Set(results.map(b => b.frame).filter(Boolean))).sort(), [results])
    const years = useMemo(() => Array.from(new Set(results.map(b => b.year).filter(Boolean))).sort((a, b) => (b as number) - (a as number)), [results])

    // Apply filters and sorting
    useEffect(() => {
        let res = [...results]

        if (selectedSubCategory) res = res.filter(b => b.sub_category === selectedSubCategory)
        if (selectedBrand) res = res.filter(b => b.brand === selectedBrand)
        if (selectedFrame) res = res.filter(b => b.frame === selectedFrame)
        if (selectedYear) res = res.filter(b => b.year?.toString() === selectedYear)
        if (priceRange[0] > 0 || priceRange[1] < 20000) {
            res = res.filter(b => {
                if (!b.price) return false
                return b.price >= priceRange[0] && b.price <= priceRange[1]
            })
        }

        switch (sortBy) {
            case 'newest': res.sort((a, b) => (b.year || 0) - (a.year || 0)); break;
            case 'price-low': res.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
            case 'price-high': res.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
            case 'score': res.sort((a, b) => {
                const scoreA = ((a.vfm_score_1_to_10 || 0) + (a.build_1_10 || 0)) / 2
                const scoreB = ((b.vfm_score_1_to_10 || 0) + (b.build_1_10 || 0)) / 2
                return scoreB - scoreA
            }); break;
            case 'value-desc': res.sort((a, b) => (b.value_score || 0) - (a.value_score || 0)); break;
            case 'performance-desc': res.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0)); break;
            case 'comfort-desc': res.sort((a, b) => (b.ride_comfort_1_10 || 0) - (a.ride_comfort_1_10 || 0)); break;
            case 'position-desc': res.sort((a, b) => (b.posture_1_10 || 0) - (a.posture_1_10 || 0)); break;
            default: res.sort((a, b) => a.brand.localeCompare(b.brand));
        }

        setFilteredResults(res)
        setDisplayCount(15)
    }, [results, selectedSubCategory, selectedBrand, selectedFrame, selectedYear, priceRange, sortBy])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchInput.trim().length >= 2) {
            router.push(`/${lang}/search?q=${encodeURIComponent(searchInput.trim())}`)
        }
    }

    const resetFilters = () => {
        setSelectedSubCategory('')
        setSelectedBrand('')
        setSelectedFrame('')
        setSelectedYear('')
        setPriceRange([0, 20000])
        setSortBy('newest')
    }

    const displayedBikes = filteredResults.slice(0, displayCount)
    const hasMore = displayCount < filteredResults.length

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header / Search Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <form onSubmit={handleSearch} className="flex gap-4 max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={dict?.nav?.search_placeholder || "Search bikes..."}
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900"
                        />
                        <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                            {dict?.nav?.search || 'Search'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="lg:hidden">
                        <button
                            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2l-6 7v6l-4 2v-8L3 6V4z" />
                            </svg>
                            {dict?.filters?.title || 'Filters'}
                        </button>
                    </div>

                    {/* Filters Sidebar */}
                    <aside className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block lg:w-64 flex-shrink-0`}>
                        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24 border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-900">{dict?.filters?.title || 'Filters'}</h2>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={resetFilters}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        {dict?.filters?.reset || 'Reset'}
                                    </button>
                                    <button
                                        onClick={() => setMobileFiltersOpen(false)}
                                        className="text-sm text-gray-500 hover:text-gray-700 lg:hidden"
                                    >
                                        {dict?.common?.close || 'Close'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Sort */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {dict?.filters?.sort_by || 'Sort By'}
                                    </label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                                    >
                                        <option value="newest">{dict?.filters?.sort_newest || 'Newest First'}</option>
                                        <option value="price-low">{dict?.filters?.sort_price_low || 'Price: Low to High'}</option>
                                        <option value="price-high">{dict?.filters?.sort_price_high || 'Price: High to Low'}</option>
                                        <option value="score">{dict?.filters?.sort_score || 'Overall Score'}</option>
                                        <option value="value-desc">{dict?.filters?.sort_value || 'Value (High to Low)'}</option>
                                        <option value="performance-desc">{dict?.filters?.sort_performance || 'Performance (High to Low)'}</option>
                                    </select>
                                </div>

                                {/* Sub Category */}
                                {subCategories.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {dict?.filters?.sub_category || 'Sub Category'}
                                        </label>
                                        <select
                                            value={selectedSubCategory}
                                            onChange={(e) => setSelectedSubCategory(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                                        >
                                            <option value="">{dict?.filters?.all || 'All'}</option>
                                            {subCategories.map((sub) => (
                                                <option key={sub as string} value={sub as string}>
                                                    {sub as string}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Brand */}
                                {brands.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {dict?.filters?.brand || 'Brand'}
                                        </label>
                                        <select
                                            value={selectedBrand}
                                            onChange={(e) => setSelectedBrand(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                                        >
                                            <option value="">{dict?.filters?.all_brands || 'All Brands'}</option>
                                            {brands.map((brand) => (
                                                <option key={brand} value={brand}>
                                                    {brand}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Frame */}
                                {frames.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {dict?.filters?.frame_material || 'Frame Material'}
                                        </label>
                                        <select
                                            value={selectedFrame}
                                            onChange={(e) => setSelectedFrame(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                                        >
                                            <option value="">{dict?.filters?.all_frames || 'All Frames'}</option>
                                            {frames.slice(0, 20).map((frame) => (
                                                <option key={frame as string} value={frame as string}>
                                                    {frame as string}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Year */}
                                {years.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {dict?.filters?.year || 'Year'}
                                        </label>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                                        >
                                            <option value="">{dict?.filters?.all_years || 'All Years'}</option>
                                            {years.map((year) => (
                                                <option key={year as number} value={year as number}>
                                                    {year as number}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Price Range */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {dict?.filters?.price_range || 'Price Range'}
                                    </label>
                                    <div className="space-y-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max="20000"
                                            step="100"
                                            value={priceRange[1]}
                                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                            className="w-full bg-white cursor-pointer"
                                        />
                                        <div className="flex items-center justify-between text-sm text-gray-600 font-medium">
                                            <span>${priceRange[0].toLocaleString()}</span>
                                            <span>${priceRange[1].toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Results Count */}
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    {dict?.filters?.showing || 'Showing'} <span className="font-bold text-gray-900">{filteredResults.length}</span> {dict?.filters?.bikes || 'bikes'}
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* Results Grid */}
                    <div className="flex-1">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {query ? (
                                    <>Search results for <span className="text-blue-600">"{query}"</span></>
                                ) : (
                                    'Search Results'
                                )}
                            </h1>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="bg-white rounded-xl h-[400px] animate-pulse border border-gray-100 shadow-sm">
                                        <div className="h-48 bg-gray-100 rounded-t-xl mb-4"></div>
                                        <div className="px-6 space-y-3">
                                            <div className="h-6 bg-gray-100 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                                            <div className="h-10 bg-gray-100 rounded mt-6"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredResults.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {displayedBikes.map((bike) => (
                                        <BikeCard
                                            key={bike.id}
                                            bike={bike}
                                            categorySlug={bike.category || 'bikes'}
                                            lang={lang}
                                        />
                                    ))}
                                </div>

                                {hasMore && (
                                    <div className="mt-10 text-center">
                                        <button
                                            onClick={() => setDisplayCount(prev => prev + 15)}
                                            className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-sm"
                                        >
                                            {dict?.filters?.load_more || 'Load More'}
                                        </button>
                                    </div>
                                )}

                                {displayCount > 15 && (
                                    <div className="mt-8 text-center">
                                        <button
                                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                            className="text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            ↑ {dict?.filters?.back_to_top || 'Back to Top'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{dict?.filters?.no_bikes_match || "No bikes found"}</h3>
                                <p className="text-gray-600 mb-6">We couldn't find any bikes matching your search criteria. Try adjusting your filters or search term.</p>
                                <button
                                    onClick={resetFilters}
                                    className="text-blue-600 font-semibold hover:text-blue-700"
                                >
                                    {dict?.filters?.reset_filters || 'Reset Filters'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
