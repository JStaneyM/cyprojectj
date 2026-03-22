'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import BikeCard from './BikeCard'

interface Bike {
  id: number
  brand: string
  model: string
  year: number | null
  price: number | null
  slug: string
  category: string
  sub_category: string | null
  images: string[] | null
  vfm_score_1_to_10: number | null
  build_1_10: number | null
  speed_index: number | null
  overall_score: number | null
  performance_score: number | null
  value_score: number | null
  ride_comfort_1_10: number | null
  posture_1_10: number | null
  frame: string | null
}

interface CategoryPageContentProps {
  initialBikes: Bike[]
  categorySlug: string
  totalCount: number
  filterType?: 'category' | 'brand' | 'subcategory'
  filterValue?: string
  initialSubCategory?: string
  initialSortBy?: string
  dict?: any // Optional to avoid breaking other usages immediately, but we should pass it
}

export default function CategoryPageContent({
  initialBikes,
  categorySlug,
  totalCount,
  filterType = 'category',
  filterValue = '',
  initialSubCategory = '',
  initialSortBy = 'newest',
  dict
}: CategoryPageContentProps) {


  const params = useParams()
  const lang = (params?.lang as string) || 'en'

  const [bikes, setBikes] = useState<Bike[]>(initialBikes)
  const [filteredBikes, setFilteredBikes] = useState<Bike[]>(initialBikes)
  const [loading, setLoading] = useState(false)

  // Filter states
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(initialSubCategory)
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedFrame, setSelectedFrame] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Sort state
  const [sortBy, setSortBy] = useState<string>(initialSortBy)

  // Pagination state
  const [displayCount, setDisplayCount] = useState(15)
  const [hasMore, setHasMore] = useState(initialBikes.length >= 15)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Get unique values for filters
  const subCategories = Array.from(new Set(bikes.map(b => b.sub_category).filter(Boolean)))
  const brands = Array.from(new Set(bikes.map(b => b.brand).filter(Boolean))).sort()
  const frames = Array.from(new Set(bikes.map(b => b.frame).filter(Boolean))).sort()
  const years = Array.from(new Set(bikes.map(b => b.year).filter(Boolean))).sort((a, b) => (b as number) - (a as number))

  // Load all bikes for filtering
  useEffect(() => {
    const loadAllBikes = async () => {
      // If we already have all bikes (from initial load or previous fetch), don't fetch again
      if (bikes.length >= totalCount && totalCount > 0 && bikes.length > 0) return

      // If initialBikes covers everything (totalCount small), no need to fetch
      if (initialBikes.length >= totalCount && totalCount > 0) return

      setLoading(true)
      try {
        let url = `/api/bikes?limit=1000`

        if (filterType === 'brand') {
          if (filterValue) {
            const categoryName = categorySlug.replace(/bikes$/i, '').trim()
            url += `&category=${encodeURIComponent(categoryName)}`
            url += `&brand=${encodeURIComponent(filterValue)}`
          } else {
            const brandName = categorySlug.replace(/-/g, ' ')
            url += `&brand=${encodeURIComponent(brandName)}`
          }
        } else if (filterType === 'subcategory') {
          const categoryName = categorySlug.replace(/bikes$/i, '').trim()
          url += `&category=${encodeURIComponent(categoryName)}`
          const subCatName = filterValue || ''
          url += `&subcategory=${encodeURIComponent(subCatName)}`
        } else {
          const categoryName = categorySlug.replace(/bikes$/i, '').trim()
          url += `&category=${encodeURIComponent(categoryName)}`
        }

        const response = await fetch(url)
        const data = await response.json()
        if (data.bikes) {
          setBikes(data.bikes)
        }
      } catch (error) {
        console.error('Error loading bikes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAllBikes()
  }, [categorySlug, totalCount, filterType, filterValue])

  // Apply filters and sorting
  useEffect(() => {
    let result = [...bikes]

    // Apply filters
    if (selectedSubCategory) {
      result = result.filter(b => b.sub_category === selectedSubCategory)
    }
    if (selectedBrand) {
      result = result.filter(b => b.brand === selectedBrand)
    }
    if (selectedFrame) {
      result = result.filter(b => b.frame === selectedFrame)
    }
    if (selectedYear) {
      result = result.filter(b => b.year?.toString() === selectedYear)
    }
    if (priceRange[0] > 0 || priceRange[1] < 20000) {
      result = result.filter(b => {
        if (!b.price) return false
        return b.price >= priceRange[0] && b.price <= priceRange[1]
      })
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => (b.year || 0) - (a.year || 0))
        break
      case 'price-low':
        result.sort((a, b) => (a.price || 0) - (b.price || 0))
        break
      case 'price-high':
        result.sort((a, b) => (b.price || 0) - (a.price || 0))
        break
      case 'score':
        result.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
        break
      case 'value-desc':
        result.sort((a, b) => (b.value_score || 0) - (a.value_score || 0))
        break
      case 'performance-desc':
        result.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))
        break
      case 'comfort-desc':
        result.sort((a, b) => (b.ride_comfort_1_10 || 0) - (a.ride_comfort_1_10 || 0))
        break
      case 'position-desc':
        result.sort((a, b) => (b.posture_1_10 || 0) - (a.posture_1_10 || 0))
        break
      default:
        result.sort((a, b) => a.brand.localeCompare(b.brand))
    }

    setFilteredBikes(result)
    setDisplayCount(15)
    setHasMore(result.length > 15)
  }, [bikes, selectedSubCategory, selectedBrand, selectedFrame, selectedYear, priceRange, sortBy])

  const loadMore = useCallback(() => {
    const newCount = displayCount + 15
    setDisplayCount(newCount)
    setHasMore(newCount < filteredBikes.length)
  }, [displayCount, filteredBikes.length])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      },
      { threshold: 1.0 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, loadMore])

  const resetFilters = () => {
    setSelectedSubCategory('')
    setSelectedBrand('')
    setSelectedFrame('')
    setSelectedYear('')
    setPriceRange([0, 20000])
    setSortBy('newest')
  }

  const displayedBikes = filteredBikes.slice(0, displayCount)

  return (
    <>
      {filterType === 'brand' && (
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8 flex items-center gap-6 border border-gray-100">
          <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center text-3xl font-bold text-gray-400">
            {categorySlug.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight uppercase">
              {categorySlug.replace(/-/g, ' ')}
            </h1>
            <p className="text-gray-500 mt-1">
              {totalCount} models available
            </p>
          </div>
        </div>
      )}
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
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{dict?.filters?.title || 'Filters'}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetFilters}
                  className="text-sm text-blue-600 hover:text-blue-700"
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
                  <option value="comfort-desc">{dict?.filters?.sort_comfort || 'Ride Comfort (High to Low)'}</option>
                  <option value="position-desc">{dict?.filters?.sort_position || 'Riding Position (High to Low)'}</option>
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
                      <option key={sub} value={sub as string}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Brand */}
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
                    <option key={brand} value={brand as string}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frame */}
              {frames.length > 0 && frames.length < 50 && (
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
                      <option key={frame} value={frame as string}>
                        {frame}
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
                      <option key={year} value={year?.toString()}>
                        {year}
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
                    className="w-full bg-white"
                  />
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>${priceRange[0].toLocaleString()}</span>
                    <span>${priceRange[1].toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {dict?.filters?.showing || 'Showing'} <span className="font-semibold">{filteredBikes.length}</span> {dict?.filters?.bikes || 'bikes'}
              </p>
            </div>
          </div>
        </aside>

        {/* Bike Grid */}
        <div className="flex-1">
          {loading && bikes.length === initialBikes.length && (
            <div className="text-center py-8">
              <p className="text-gray-500">{dict?.filters?.load_more || 'Loading all bikes...'}</p>
            </div>
          )}

          {displayedBikes.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedBikes.map((bike) => (
                  <BikeCard
                    key={bike.id}
                    bike={bike}
                    categorySlug={categorySlug}
                    lang={lang}
                  />
                ))}
              </div>

              {hasMore && (
                <div ref={observerTarget} className="mt-8 text-center py-4">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">{dict?.filters?.load_more || 'Loading...'}</span>
                  </div>
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
            <div className="text-center py-12">
              <p className="text-gray-600">{dict?.filters?.no_bikes_match || 'No bikes match your filters.'}</p>
              <button
                onClick={resetFilters}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                {dict?.filters?.reset_filters || 'Reset Filters'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
