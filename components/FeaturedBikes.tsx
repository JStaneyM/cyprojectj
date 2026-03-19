import Link from 'next/link'
import Image from 'next/image'
import { supabaseServer } from '@/lib/supabase'
import { formatPrice, generateBikeUrl } from '@/lib/utils'

export default async function FeaturedBikes() {
  // Fetch top bikes (highest scores)
  const { data: bikes } = await supabaseServer
    .from('bikes')
    .select('id, brand, model, slug, category, sub_category, price, images, vfm_score_1_to_10, build_1_10, speed_index, ride_comfort_1_10')
    .not('vfm_score_1_to_10', 'is', null)
    .order('vfm_score_1_to_10', { ascending: false })
    .limit(6)

  if (!bikes || bikes.length === 0) return null

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Featured Bikes
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Our top-rated bicycles loved by riders worldwide
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {bikes.map((bike, index) => {
            return (
              <Link
                key={bike.id}
                href={generateBikeUrl(bike)}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Image */}
                <div className="relative aspect-bike bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                  {bike.images && bike.images.length > 0 ? (
                    <>
                      <Image
                        src={bike.images[0]}
                        alt={`${bike.brand} ${bike.model}`}
                        fill
                        className="object-contain p-6 group-hover:scale-110 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      {/* Badge */}
                      <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                        Featured
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Brand & Model */}
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                    {bike.brand} {bike.model}
                  </h3>

                  {/* Category */}
                  <p className="text-sm text-gray-500 mb-3">{bike.category}</p>

                  {/* Scores */}
                  <div className="flex items-center gap-4 mb-4">
                    {bike.vfm_score_1_to_10 && (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm font-semibold text-gray-700">
                          {bike.vfm_score_1_to_10}/10
                        </span>
                      </div>
                    )}
                    {bike.build_1_10 && (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-500">🔧</span>
                        <span className="text-sm font-semibold text-gray-700">
                          Build: {bike.build_1_10}/10
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  {bike.price && (
                    <div className="text-2xl font-bold text-gray-900 mb-4">
                      {formatPrice(bike.price)}
                    </div>
                  )}

                  {/* CTA Button */}
                  <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                    View Details
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href="/roadbikes"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            View All Bikes
          </Link>
        </div>
      </div>
    </section>
  )
}
