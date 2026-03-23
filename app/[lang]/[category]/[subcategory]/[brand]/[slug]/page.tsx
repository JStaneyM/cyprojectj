import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseServer, Bike } from '@/lib/supabase'
import { calculateBikeMetrics, parseGeometryData, generateUrlSlug, formatCategoryForUrl, formatPrice, getMetadataAlternates } from '@/lib/utils'
import { SITE_URL } from '@/lib/site'
import ScoreCard from '@/components/ScoreCard'
import ScoreSection from '@/components/ScoreSection'
import ScoreSectionWithToggle from '@/components/ScoreSectionWithToggle'
import SpecsTable from '@/components/SpecsTable'
import ImageGallery from '@/components/ImageGallery'
import AddToCompareButton from '@/components/AddToCompareButton'
import BikeCarousel from '@/components/BikeCarousel'
import { getSameBrandBikes, getBikesByYear, getBetterValueBikes } from '@/lib/recommendations'
import InteractiveScoreSummary from '@/components/InteractiveScoreSummary'

export const revalidate = 0

interface PageProps {
  params: {
    lang: string
    category: string
    subcategory: string
    brand: string
    slug: string
  }
}

// Since we need interactivity for 'Show Explanations', we convert the main parts 
// to client components or the whole page if necessary. 
// However, generateMetadata and generateStaticParams must stay in server components.
// I will keep the structure but add 'use client' and move data fetching to a separate server function if needed.
// Actually, I'll create a Client Page component.

async function getBikeFromParams(params: PageProps['params']): Promise<Bike | null> {
  const slug = decodeURIComponent(params.slug).trim()

  console.log('[Bike Lookup] Searching by slug:', { slug, params })

  try {
    const { data } = await supabaseServer
      .from('bikes')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (data) {
      console.log('[Bike Lookup] Found slug match:', data.id, data.slug)
      return data as Bike
    }

    console.log('[Bike Lookup] No bike found for slug:', slug)
    return null
  } catch (error) {
    console.error('[Bike Lookup] Error fetching bike:', error)
    return null
  }
}

export async function generateStaticParams() {
  const { data: bikes } = await supabaseServer.from('bikes').select('category, sub_category, brand, slug').limit(10)
  if (!bikes) return []
  return bikes.map((bike) => ({
    category: formatCategoryForUrl(bike.category),
    subcategory: bike.sub_category ? generateUrlSlug(bike.sub_category) : 'general',
    brand: generateUrlSlug(bike.brand),
    slug: bike.slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const bike = await getBikeFromParams(params)
  if (!bike) return { title: 'Bike Not Found' }

  // Localize SEO fields
  const langSuffix = `_${params.lang}`
  const localizedTitle = (bike as any)[`title_seo${langSuffix}`] || bike.title_seo
  const localizedDesc = (bike as any)[`meta_desc${langSuffix}`] || bike.meta_desc

  const title = localizedTitle || bike.title || `${bike.brand} ${bike.model} ${bike.year || ''}`
  const description = localizedDesc || ''

  // Generate alternates
  // We need to construct the path without the lang prefix
  const pathSuffix = `/${params.category}/${params.subcategory}/${params.brand}/${params.slug}`
  const alternates = getMetadataAlternates(pathSuffix, params.lang)

  return { title, description, alternates }
}

import { getDictionary } from '@/lib/dictionaries'

export default async function BikePage({ params }: PageProps) {
  const bike = await getBikeFromParams(params)
  if (!bike) notFound()

  const dict = await getDictionary(params.lang)
  const englishDict = params.lang === 'en' ? dict : await getDictionary('en')

  // Helper to resolve nested keys
  const t = (key: string) => {
    return key.split('.').reduce((o: any, i) => (o ? o[i] : key), dict) || key
  }

  const findDictionaryPathByValue = (node: any, target: string, currentPath = ''): string | null => {
    if (!node || typeof node !== 'object') return null

    for (const [key, value] of Object.entries(node)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key

      if (typeof value === 'string') {
        if (value.trim().toLowerCase() === target.trim().toLowerCase()) {
          return nextPath
        }
        continue
      }

      const nestedMatch = findDictionaryPathByValue(value, target, nextPath)
      if (nestedMatch) return nestedMatch
    }

    return null
  }

  const translateLookupValue = (value: string) => {
    if (!value) return value
    if (value.includes('.')) return t(value)

    const bucketPath = findDictionaryPathByValue((englishDict as any).buckets, value, 'buckets')
    if (bucketPath) return t(bucketPath)

    return value
  }

  const rawMetrics = calculateBikeMetrics(bike)

  // Translate metrics
  const metrics = Object.entries(rawMetrics).reduce((acc: any, [key, metric]: [string, any]) => {
    if (key === 'overallScore') {
      acc[key] = metric
      return acc
    }
    // Handle optional battery
    if (!metric) return acc

    acc[key] = {
      ...metric,
      label: t(metric.label),
      description: translateLookupValue(metric.description)
    }
    return acc
  }, {}) as typeof rawMetrics

  // Localize bike fields (Type 4)
  const langSuffix = `_${params.lang}`
  const localizedBike = { ...bike } as any

  // List of fields to attempt localization
  const textFields = [
    'bike_desc', 'meta_desc', 'title_seo',
    'fit_reason', 'vfm_reason', 'build_reason', 'aero_reason',
    'climb_reason', 'suspension_reason', 'posture_reason',
    'responsiveness_reason', 'speed_reason', 'comfort_reason',
    'surface_reason', 'battery_reason'
  ]

  textFields.forEach(field => {
    // Check if localized field exists (e.g. bike_desc_fr)
    const localizedKey = `${field}${langSuffix}`
    const localizedVal = (bike as any)[localizedKey]

    // Debug logging for localization
    if (field === 'speed_reason' || field === 'bike_desc') {
      console.log(`[Localization Debug] Field: ${field}, Lang: ${params.lang}, Key: ${localizedKey}, Value: ${localizedVal?.substring(0, 20)}...`)
      console.log(`[Localization Debug] Original ${field}: ${(bike as any)[field]?.substring(0, 20)}...`)
    }

    if (localizedVal && localizedVal.trim() !== '') {
      localizedBike[field] = localizedVal
    }
  })

  // Override specific explanations that might have different names in calculateBikeMetrics usage
  // The UI components access specific reasons. InteractiveScoreSummary uses e.g. bike.fit_score_explanation
  // But wait, the original code used things like `bike.posture_reason || bike.riding_position_explanation`
  // My localizedBike handles `posture_reason`. I should make sure I didn't miss legacy mappings if they are important.
  // The CSV has `fit_reason`, `posture_reason` etc. So limiting to the lists above should cover the new CSV data.

  // Map localized reasons to legacy explanation fields for InteractiveScoreSummary compatibility
  localizedBike.value_score_explanation = localizedBike.vfm_reason || localizedBike.value_score_explanation
  localizedBike.fit_score_explanation = localizedBike.fit_reason || localizedBike.fit_score_explanation
  localizedBike.general_score_explanation = localizedBike.build_reason || localizedBike.general_score_explanation
  const geometryData = parseGeometryData(bike.geometry_data)
  const comparisonBike = { ...localizedBike, image: bike.images?.[0] || null }
  const speedScore = localizedBike.speed_index !== null && localizedBike.speed_index !== undefined
    ? localizedBike.speed_index / 10
    : null
  const climbScore = localizedBike.climb_1_10 !== null && localizedBike.climb_1_10 !== undefined
    ? localizedBike.climb_1_10 / 10
    : null
  const aeroScore = localizedBike.aero_1_10 !== null && localizedBike.aero_1_10 !== undefined
    ? localizedBike.aero_1_10 / 10
    : null
  const postureScore = localizedBike.posture_1_10 !== null && localizedBike.posture_1_10 !== undefined
    ? localizedBike.posture_1_10 / 10
    : null
  const handlingScore = localizedBike.responsiveness_1_10 !== null && localizedBike.responsiveness_1_10 !== undefined
    ? localizedBike.responsiveness_1_10 / 10
    : null
  const fitFlexScore = localizedBike.fit_flexibility_1_10 !== null && localizedBike.fit_flexibility_1_10 !== undefined
    ? localizedBike.fit_flexibility_1_10 / 10
    : null
  const comfortScore = localizedBike.ride_comfort_1_10 !== null && localizedBike.ride_comfort_1_10 !== undefined
    ? localizedBike.ride_comfort_1_10 / 10
    : null
  const buildScore = localizedBike.build_1_10 !== null && localizedBike.build_1_10 !== undefined
    ? localizedBike.build_1_10 / 10
    : null
  const valueScore = localizedBike.vfm_score_1_to_10 !== null && localizedBike.vfm_score_1_to_10 !== undefined
    ? localizedBike.vfm_score_1_to_10 / 10
    : null
  const showSuspensionMetric =
    (localizedBike.category?.toLowerCase().includes('mountain') || localizedBike.category?.toLowerCase().includes('emtb')) &&
    !!metrics.suspension
  const suspensionMetric = metrics.suspension
  const fitMetricCount = [postureScore, handlingScore, fitFlexScore, comfortScore].filter(score => score !== null).length
  const fitGridCols = {
    1: 'grid-cols-1 lg:grid-cols-3',
    2: 'grid-cols-1 lg:grid-cols-3',
    3: 'grid-cols-1 lg:grid-cols-3',
    4: 'grid-cols-1 lg:grid-cols-4',
  }[fitMetricCount] || 'grid-cols-1 lg:grid-cols-4'
  const valueGridCols = 'grid-cols-1 lg:grid-cols-3'
  const metricSectionContainerClass = 'w-full max-w-6xl'

  const subCategoryName = localizedBike.sub_category
  const [sameBrandBikes, bikes2025, bikes2024, bikes2023, bikes2022, betterValueBikes] = await Promise.all([
    getSameBrandBikes(bike),
    getBikesByYear(2025, bike.category, subCategoryName),
    getBikesByYear(2024, bike.category, subCategoryName),
    getBikesByYear(2023, bike.category, subCategoryName),
    getBikesByYear(2022, bike.category, subCategoryName),
    getBetterValueBikes(bike)
  ])

  const baseUrl = SITE_URL
  const bikeUrl = `${baseUrl}/${params.lang}/${params.category}/${params.subcategory}/${params.brand}/${params.slug}`

  // Ensure title/desc are from localizedBike for page metadata/h1
  // But metadata generation is separate. I need to fix generateMetadata too if I want it localized there.
  // For now, let's focus on the Page component rendering.

  return (
    <main className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": `${bikeUrl}#product`,
            "name": `${localizedBike.brand} ${localizedBike.model} ${localizedBike.year || ''}`.trim(),
            "brand": {
              "@type": "Brand",
              "name": localizedBike.brand
            },
            "category": localizedBike.sub_category || localizedBike.category,
            "image": localizedBike.images?.map((img: string) => img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`) || [],
            "description": localizedBike.bike_desc || localizedBike.meta_desc || `Detailed review and specs for ${localizedBike.brand} ${localizedBike.model}.`,
            "additionalProperty": [
              {
                "@type": "PropertyValue",
                "name": "Manufacturer Suggested Retail Price",
                "value": localizedBike.price ? `EUR ${localizedBike.price.toLocaleString('en-US')}` : "N/A"
              }
            ]
          })
        }}
      />

      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
            <a href={`/${params.lang}`} className="hover:text-blue-600">Home</a>
            <span className="mx-2">/</span>
            <a href={`/${params.lang}/${params.category}`} className="hover:text-blue-600 capitalize">
              {localizedBike.category}
            </a>
            {localizedBike.sub_category && (
              <>
                <span className="mx-2">/</span>
                <a href={`/${params.lang}/${params.category}/${generateUrlSlug(localizedBike.sub_category)}`} className="hover:text-blue-600 capitalize">
                  {localizedBike.sub_category}
                </a>
              </>
            )}
            <span className="mx-2">/</span>
            <a href={`/${params.lang}/${params.category}/${localizedBike.sub_category ? generateUrlSlug(localizedBike.sub_category) : 'general'}/${generateUrlSlug(localizedBike.brand)}`} className="hover:text-blue-600 capitalize">
              {localizedBike.brand}
            </a>
            {localizedBike.year && (
              <>
                <span className="mx-2">/</span>
                <span className="text-gray-500">{localizedBike.year}</span>
              </>
            )}
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">{localizedBike.model}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg p-6 lg:p-10 mb-8 border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">{localizedBike.model}</h1>
              <p className="text-xl lg:text-2xl text-gray-600 mb-4 font-semibold">{localizedBike.brand}</p>
              {localizedBike.sub_category && <p className="text-lg text-gray-500 mb-6 font-medium">{localizedBike.sub_category}</p>}
              <p className="text-gray-700 mb-6 leading-relaxed text-lg">
                {localizedBike.bike_desc}
              </p>
              <div className="mb-8"><AddToCompareButton bike={comparisonBike} variant="full" className="max-w-xs" /></div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <span className="text-7xl font-bold text-gray-900">{metrics.overallScore.toFixed(1)}</span>
                  <div className="flex justify-center mt-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`w-6 h-6 ${i < Math.floor(metrics.overallScore / 2) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                  <p className="text-gray-600 font-medium text-sm">{dict.common?.rating || 'Rating'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center"><ImageGallery images={localizedBike.images || []} alt={`${localizedBike.brand} ${localizedBike.model}`} /></div>
          </div>

          <InteractiveScoreSummary metrics={metrics} bike={localizedBike} containerClassName={metricSectionContainerClass} />

          <ScoreSection>
            <ScoreSectionWithToggle title={t('scores.performance') || "Performance"} subtitle="Built for speed and efficiency" gridCols="grid-cols-1 lg:grid-cols-3" containerClassName={metricSectionContainerClass}>
              {speedScore !== null && (
                <ScoreCard label={metrics.speed.label} score={speedScore} maxScore={10} description={metrics.speed.description} variant="inline" explanation={localizedBike.speed_reason} />
              )}
              {climbScore !== null && (
                <ScoreCard
                  label={metrics.climbingEfficiency.label}
                  score={climbScore}
                  maxScore={10}
                  description={localizedBike.climb_bucket ? translateLookupValue(localizedBike.climb_bucket) : metrics.climbingEfficiency.description}
                  variant="inline"
                  explanation={localizedBike.climb_reason || localizedBike.climbing_efficiency_explanation}
                />
              )}
              {showSuspensionMetric && suspensionMetric && suspensionMetric.score !== null && (
                <ScoreCard label={suspensionMetric.label} score={suspensionMetric.score} maxScore={10} description={suspensionMetric.description} variant="inline" explanation={localizedBike.suspension_reason} />
              )}
              {!showSuspensionMetric && aeroScore !== null && (
                <ScoreCard label={metrics.aerodynamics.label} score={aeroScore} maxScore={10} description={metrics.aerodynamics.description} variant="inline" explanation={localizedBike.aero_reason || localizedBike.aerodynamics_explanation} />
              )}
            </ScoreSectionWithToggle>
          </ScoreSection>

          <ScoreSection>
            <ScoreSectionWithToggle title={t('scores.fit') || "Fit Score"} subtitle="Dialed-in Fit & Comfort" gridCols={fitGridCols} containerClassName={metricSectionContainerClass}>
              {postureScore !== null && (
                <ScoreCard label={metrics.ridingPosition.label} score={postureScore} maxScore={10} description={metrics.ridingPosition.description} variant="inline" explanation={localizedBike.posture_reason || localizedBike.riding_position_explanation} />
              )}
              {handlingScore !== null && (
                <ScoreCard label={metrics.handling.label} score={handlingScore} maxScore={10} description={metrics.handling.description} variant="inline" explanation={localizedBike.responsiveness_reason || localizedBike.handling_explanation} />
              )}
              {fitFlexScore !== null && (
                <ScoreCard label={metrics.fitFlexibility.label} score={fitFlexScore} maxScore={10} description={metrics.fitFlexibility.description} variant="inline" explanation={localizedBike.fit_reason || localizedBike.fit_flexibility_explanation} />
              )}
              {comfortScore !== null && (
                <ScoreCard label={metrics.rideComfort.label} score={comfortScore} maxScore={10} description={metrics.rideComfort.description} variant="inline" explanation={localizedBike.comfort_reason || localizedBike.ride_comfort_explanation} />
              )}
            </ScoreSectionWithToggle>
          </ScoreSection>

          <ScoreSection>
            <ScoreSectionWithToggle title={t('scores.value') || "Value"} gridCols={valueGridCols} containerClassName={metricSectionContainerClass}>
              {buildScore !== null && (
                <ScoreCard label={metrics.buildQuality.label} score={buildScore} maxScore={10} description={metrics.buildQuality.description} variant="inline" metricType="value" explanation={localizedBike.build_reason || localizedBike.build_quality_explanation} />
              )}
              {valueScore !== null && (
                <ScoreCard label={metrics.valueForMoney.label} score={valueScore} maxScore={10} description={metrics.valueForMoney.description} variant="inline" metricType="value" explanation={localizedBike.vfm_reason || localizedBike.value_for_money_explanation} />
              )}
              <ScoreCard label={metrics.surfaceRange.label} score={metrics.surfaceRange.score ?? 0} maxScore={10} description={metrics.surfaceRange.description} variant="inline" explanation={localizedBike.surface_reason || localizedBike.surface_range_explanation} hideValue={true} />
            </ScoreSectionWithToggle>
          </ScoreSection>

          {metrics.battery && (
            <div className={`mt-8 ${metricSectionContainerClass}`}>
              <h3 className="text-xl font-bold text-gray-900 mb-5">{metrics.battery.label}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ScoreCard label={metrics.battery.label} score={metrics.battery.score ?? 0} maxScore={10} description={metrics.battery.description} variant="inline" explanation={localizedBike.battery_reason} customValue={localizedBike.battery_range || undefined} />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 lg:p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{dict.common?.specifications || "Specifications"}</h2>
          <SpecsTable bike={localizedBike} dict={dict} />
        </div>

        {bike.geometry_data && (
          <div className="bg-white rounded-xl shadow-md p-6 lg:p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{dict.common?.geometry || "Geometry"}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 italic">{dict.common?.measurement || "Measurement"}</th>
                    {geometryData['Size']?.map((size, idx) => (<th key={idx} className="py-3 px-4 font-semibold text-gray-700">{size}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(geometryData).map(([key, values]) => (
                    key !== 'Size' && (
                      <tr key={key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="text-left py-3 px-4 font-medium text-gray-900">{key}</td>
                        {(values as any[]).map((value, idx) => (<td key={idx} className="py-3 px-4 text-gray-600">{value}</td>))}
                      </tr>)
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-12 space-y-12">
          <BikeCarousel title={(dict.recommendations?.same_brand || "Other bikes from {brand}").replace('{brand}', localizedBike.brand)} bikes={sameBrandBikes} lang={params.lang} />
          <BikeCarousel title={(dict.recommendations?.year_models || "{year} Models").replace('{year}', '2025')} bikes={bikes2025} lang={params.lang} />
          <BikeCarousel title={(dict.recommendations?.year_models || "{year} Models").replace('{year}', '2024')} bikes={bikes2024} lang={params.lang} />
          <BikeCarousel title={(dict.recommendations?.year_models || "{year} Models").replace('{year}', '2023')} bikes={bikes2023} lang={params.lang} />
          <BikeCarousel title={(dict.recommendations?.year_models || "{year} Models").replace('{year}', '2022')} bikes={bikes2022} lang={params.lang} />
          <BikeCarousel title={dict.recommendations?.better_value || "More Value for Money Options"} bikes={betterValueBikes} lang={params.lang} />
        </div>
      </div>



    </main>
  )
}
