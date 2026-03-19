'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, generateBikeUrl } from '@/lib/utils'

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
}

interface InfiniteScrollBikesProps {
  initialBikes: Bike[]
  categorySlug: string
  totalCount: number
}

export default function InfiniteScrollBikes({ initialBikes, categorySlug, totalCount }: InfiniteScrollBikesProps) {
  const params = useParams()
  const lang = (params?.lang as string) || 'en'
  const [bikes, setBikes] = useState<Bike[]>(initialBikes)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialBikes.length < totalCount)
  const loaderRef = useRef<HTMLDivElement>(null)

  const loadMoreBikes = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const nextPage = page + 1
      const response = await fetch(`/api/bikes?category=${categorySlug}&page=${nextPage}&limit=16`)
      const data = await response.json()

      if (data.bikes && data.bikes.length > 0) {
        setBikes(prev => [...prev, ...data.bikes])
        setPage(nextPage)
        setHasMore(data.pagination.hasMore)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more bikes:', error)
    } finally {
      setLoading(false)
    }
  }, [page, loading, hasMore, categorySlug])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreBikes()
        }
      },
      { threshold: 0.1 }
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [loadMoreBikes, hasMore, loading])

  return (
    <>
      {/* Bike Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {bikes.map((bike) => (
          <Link
            key={bike.id}
            href={generateBikeUrl(bike, lang)}
            className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all overflow-hidden"
          >
            {/* Image */}
            <div className="relative aspect-[16/9] bg-gray-100">
              {bike.images && bike.images.length > 0 ? (
                <Image
                  src={bike.images[0]}
                  alt={`${bike.brand} ${bike.model}`}
                  fill
                  className="object-contain p-4 group-hover:scale-105 transition-transform"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-400">No image</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {bike.brand}
                </h2>
                <h3 className="text-sm text-gray-600">{bike.model}</h3>
              </div>

              {bike.sub_category && (
                <div className="mb-3">
                  <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    {bike.sub_category}
                  </span>
                </div>
              )}

              {bike.price && (
                <div className="text-xl font-bold text-gray-900 mb-3">
                  {formatPrice(bike.price)}
                </div>
              )}

              {/* Quick Stats */}
              <div className="flex gap-2 text-xs">
                {bike.vfm_score_1_to_10 && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Value:</span>
                    <span className="font-semibold text-gray-900">
                      {bike.vfm_score_1_to_10}/10
                    </span>
                  </div>
                )}
                {bike.build_1_10 && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Build:</span>
                    <span className="font-semibold text-gray-900">
                      {bike.build_1_10}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Loading indicator / Scroll trigger */}
      <div ref={loaderRef} className="py-8 flex justify-center">
        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">Loading more bikes...</span>
          </div>
        )}
        {!hasMore && bikes.length > 0 && (
          <p className="text-gray-500">You've seen all {bikes.length} bikes in this category</p>
        )}
      </div>

      {/* Scroll to top button - appears after loading some bikes */}
      {bikes.length > 16 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
          title="Back to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </>
  )
}
