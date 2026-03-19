import { Bike, BikeMetrics, BikeScore } from './supabase'

export function generateSlug(brand: string, model: string, year?: number | null): string {
  const text = `${brand}-${model}${year ? `-${year}` : ''}`
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}

export const SUPPORTED_LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'nl']

/**
 * Generate Metadata alternates for SEO
 */
export function getMetadataAlternates(pathSuffix: string, currentLang: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cycleproject.vercel.app'
  const languages: Record<string, string> = {}

  SUPPORTED_LANGUAGES.forEach(lang => {
    languages[lang] = `${baseUrl}/${lang}${pathSuffix}`
  })

  return {
    canonical: `${baseUrl}/${currentLang}${pathSuffix}`,
    languages: {
      ...languages,
      'x-default': `${baseUrl}/en${pathSuffix}`
    }
  }
}

/**
 * Calculate bike metrics from raw data
 */
export function calculateBikeMetrics(bike: Bike): BikeMetrics {
  // Use pre-calculated scores from CSV if available, otherwise calculate
  // Performance Score (use column if available, else calculate from climbing and aerodynamics)
  const climbScore = bike.climb_1_10 || 5
  const aeroScore = bike.aero_1_10 || 5
  const performanceScore = bike.performance_score ?? Math.round(((climbScore + aeroScore) / 2) * 10) / 10

  // Value Score (use column if available, else use vfm_score_1_to_10)
  const valueScore = bike.value_score ?? bike.vfm_score_1_to_10 ?? 5

  // Fit Score (use column if available, else calculate from fit flexibility and posture)
  const fitFlexScore = bike.fit_flexibility_1_10 || 5
  const postureScore = bike.posture_1_10 || 5
  const fitScore = bike.fit_score ?? Math.round(((fitFlexScore + postureScore) / 2) * 10) / 10

  // General Score (use column if available, else calculate from build quality and ride comfort)
  const buildScore = bike.build_1_10 || 5
  const comfortScore = bike.ride_comfort_1_10 || 5
  const generalScore = bike.general_score ?? Math.round(((buildScore + comfortScore) / 2) * 10) / 10

  // Overall Score (use column if available, else calculate average)
  const overallScore = bike.overall_score ?? Math.round(((performanceScore + valueScore + fitScore + generalScore) / 4) * 10) / 10

  // Get descriptive labels
  const getPerformanceLabel = (score: number): string => {
    if (score >= 8.5) return 'buckets.climbing.excellent_climber'
    if (score >= 7) return 'buckets.climbing.good_climber'
    if (score >= 5.5) return 'buckets.climbing.moderate_climber'
    return 'buckets.climbing.city_climber'
  }

  const getValueLabel = (score: number): string => {
    if (score >= 8) return 'buckets.value.extreme_value'
    if (score >= 6.5) return 'buckets.value.strong_value'
    if (score >= 5) return 'buckets.value.good_value'
    return 'buckets.value.premium_pricing'
  }

  const getFitLabel = (score: number): string => {
    if (score >= 8) return 'buckets.fit_flexibility.optimal_fit'
    if (score >= 6) return 'buckets.fit_flexibility.highly_adaptable'
    if (score >= 4) return 'buckets.fit_flexibility.versatile'
    return 'buckets.fit_flexibility.race_specific_fit'
  }

  const getBuildLabel = (score: number): string => {
    if (score >= 8) return 'buckets.build_quality.premium_build'
    if (score >= 6) return 'buckets.build_quality.strong_build'
    if (score >= 4) return 'buckets.build_quality.solid_build'
    return 'buckets.build_quality.basic_build'
  }

  const getPostureLabel = (score: number): string => {
    if (score <= 3) return 'buckets.posture.aggressive'
    if (score <= 5) return 'buckets.posture.sporty'
    if (score <= 7) return 'buckets.posture.balanced'
    return 'buckets.posture.relaxed'
  }

  const getAeroLabel = (score: number): string => {
    if (score >= 8) return 'buckets.aero.very_aero'
    if (score >= 6) return 'buckets.aero.aero'
    if (score >= 4) return 'buckets.aero.moderate_aero'
    return 'buckets.aero.non_aero'
  }

  const getComfortLabel = (score: number): string => {
    if (score >= 8.5) return 'buckets.ride_comfort.endurance_focused'
    if (score >= 7) return 'buckets.ride_comfort.high_comfort'
    if (score >= 5) return 'buckets.ride_comfort.everyday_comfort'
    return 'buckets.ride_comfort.race_aggressive'
  }

  const getResponsivenessLabel = (score: number): string => {
    if (score >= 8) return 'buckets.handling.highly_responsive'
    if (score >= 6) return 'buckets.handling.precise_control'
    if (score >= 4) return 'buckets.handling.balanced_handling'
    return 'buckets.handling.stable'
  }

  const getSpeedLabel = (score: number): string => {
    if (score >= 8.5) return 'buckets.speed.extremely_fast'
    if (score >= 7) return 'buckets.speed.very_fast'
    if (score >= 5.5) return 'buckets.speed.fast'
    if (score >= 4) return 'buckets.speed.moderate_speed'
    return 'buckets.speed.relaxed_pace'
  }

  const speedScore = bike.speed_index || 5

  const getSuspensionLabel = (score: number): string => {
    if (score >= 8) return 'buckets.suspension.plush'
    if (score >= 6) return 'buckets.suspension.balanced'
    if (score >= 4) return 'buckets.suspension.firm'
    return 'buckets.suspension.rigid'
  }

  const getBatteryLabel = (score: number): string => {
    if (score >= 8) return 'buckets.battery.excellent_range'
    if (score >= 6) return 'buckets.battery.good_range'
    if (score >= 4) return 'buckets.battery.moderate_range'
    return 'buckets.battery.limited_range'
  }

  // Battery should only show for E-bikeRoad and E-bikeMountain categories
  const categoryLower = bike.category?.toLowerCase() || ''
  const isEBikeWithBattery = categoryLower.includes('ebike') ||
    categoryLower.includes('electric') ||
    categoryLower.includes('e-bike') ||
    categoryLower.includes('e-road') ||
    categoryLower.includes('e-mountain') ||
    categoryLower.includes('e-gravel') ||
    (bike.motor && bike.motor.length > 0) ||
    (bike.battery && bike.battery.length > 0)

  // Suspension logic
  const suspensionScore = bike.suspension_1_10 || 5
  // Determine if we should show suspension (mainly for MTB) - handled in UI, but we calculate it here.

  return {
    overallScore,
    performance: {
      label: 'scores.performance',
      score: performanceScore,
      maxScore: 10,
      description: getPerformanceLabel(performanceScore),
    },
    value: {
      label: 'scores.value',
      score: valueScore,
      maxScore: 10,
      description: getValueLabel(valueScore),
    },
    fit: {
      label: 'scores.fit',
      score: fitScore,
      maxScore: 10,
      description: getFitLabel(fitScore),
    },
    general: {
      label: 'scores.general',
      score: generalScore,
      maxScore: 10,
      description: getBuildLabel(generalScore),
    },
    speed: {
      label: 'scores.speed',
      score: speedScore,
      maxScore: 10,
      description: getSpeedLabel(speedScore),
    },
    climbingEfficiency: {
      label: 'scores.climbing',
      score: climbScore,
      maxScore: 10,
      description: getPerformanceLabel(climbScore),
    },
    aerodynamics: {
      label: 'scores.aerodynamics',
      score: aeroScore,
      maxScore: 10,
      description: getAeroLabel(aeroScore),
    },
    ridingPosition: {
      label: 'scores.riding_position',
      score: postureScore,
      maxScore: 10,
      description: getPostureLabel(postureScore),
    },
    handling: {
      label: 'scores.handling',
      score: bike.responsiveness_1_10 || 5,
      maxScore: 10,
      description: getResponsivenessLabel(bike.responsiveness_1_10 || 5),
    },
    fitFlexibility: {
      label: 'scores.fit_flexibility',
      score: fitFlexScore,
      maxScore: 10,
      description: getFitLabel(fitFlexScore),
    },
    rideComfort: {
      label: 'scores.ride_comfort',
      score: comfortScore,
      maxScore: 10,
      description: getComfortLabel(comfortScore),
    },
    buildQuality: {
      label: 'scores.build_quality',
      score: buildScore,
      maxScore: 10,
      description: getBuildLabel(buildScore),
    },
    valueForMoney: {
      label: 'scores.value_for_money',
      score: valueScore,
      maxScore: 10,
      description: getValueLabel(valueScore),
    },
    surfaceRange: {
      label: 'scores.surface_range',
      score: 8.4, // Default, can be calculated based on surface_range field
      maxScore: 10,
      description: bike.surface_range || 'buckets.surface_range.all_road_capable', // Fallback key
    },
    battery: isEBikeWithBattery ? {
      label: 'scores.battery',
      score: 7, // Placeholder score, UI will use custom text
      maxScore: 10,
      description: bike.battery_bucket || getBatteryLabel(7),
    } : undefined,
    suspension: {
      label: 'scores.suspension',
      score: suspensionScore,
      maxScore: 10,
      description: bike.suspension_bucket || getSuspensionLabel(suspensionScore),
    }
  }
}

/**
 * Format price with currency
 */
export function formatPrice(price: number | null, locale: string = 'en-US'): string {
  if (!price) return 'Price not available'
  // Map our short codes to full locales if needed, or rely on browser support for 'en', 'de', etc.
  // 'en' defaults to 'en-US' behavior mostly. 'de' -> 'de-DE'.
  // Simple mapping or pass-through.
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD', // Assuming USD is base currency for now, or could change currency symbol based on locale if needed, but likely keeping USD values.
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Parse geometry data from multi-line string to structured object
 */
export function parseGeometryData(geometryData: string | null): Record<string, string[]> {
  if (!geometryData) return {}

  const lines = geometryData.split('\n').filter(line => line.trim())
  const result: Record<string, string[]> = {}

  lines.forEach(line => {
    const parts = line.split('//')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const values = parts.slice(1).map(v => v.trim())
      result[key] = values
    }
  })

  return result
}

/**
 * Get rating color based on score
 * For value/VFM scores, high scores (>= 7) are shown in green instead of blue
 */
export function getRatingColor(score: number, metricType?: 'value' | 'performance' | 'fit' | 'general' | 'speed' | 'default'): string {
  // High value scores should be green and not blue
  if (score >= 7 && (metricType === 'value' || metricType === 'speed')) return '#10b981' // green

  // Handling (Responsiveness) 10 should be green
  // "Handling and speed are 10 here but still in yellow colour. They should be green"
  // Speed is already covered above.
  if (score >= 8.5) return '#10b981' // green (Default high score)

  // Special case for Handling if it's 10 (or very high) but falling into blue/yellow?
  // Existing logic: >= 8.5 is green. If Handling 10 is yellow, maybe it was falling into wrong bucket or metricType?
  // Let's ensure top range is green.
  if (score >= 8.5) return '#10b981' // green

  if (score >= 5.5) return '#f59e0b' // orange (Warning/Medium)
  return '#ef4444' // red (Danger/Low)
}

/**
 * Format category for URL
 */
export function formatCategoryForUrl(category: string): string {
  return category.toLowerCase().replace(/\s+/g, '')
}

/**
 * Generate SEO-friendly URL slug from text
 */
export function generateUrlSlug(text: string | null): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}

/**
 * Generate new SEO-friendly bike URL
 * Format: /lang/category/sub-category/brand/slug
 */
export function generateBikeUrl(bike: {
  category: string
  sub_category?: string | null
  brand: string
  slug: string
}, lang: string = 'en'): string {
  const categorySlug = formatCategoryForUrl(bike.category) + 'bikes'
  const subCategorySlug = bike.sub_category ? generateUrlSlug(bike.sub_category) : 'general'
  const brandSlug = generateUrlSlug(bike.brand)

  return `/${lang}/${categorySlug}/${subCategorySlug}/${brandSlug}/${bike.slug}`
}

/**
 * Parse bike details from new URL format
 */
export function parseBikeUrl(segments: string[]): {
  category: string
  subCategory: string
  brand: string
  slug: string
} | null {
  if (segments.length < 4) return null

  return {
    category: segments[0],
    subCategory: segments[1],
    brand: segments[2],
    slug: segments[3],
  }
}
