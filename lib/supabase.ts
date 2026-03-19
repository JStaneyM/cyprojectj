import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for browser/client-side (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client (uses service role key - bypasses RLS)
// Only create this on server-side where service key is available
function createServerClient() {
  if (typeof window !== 'undefined') {
    // On client side, return the anon client (this shouldn't be used anyway)
    return createClient(supabaseUrl, supabaseAnonKey)
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found, using anon key')
    return createClient(supabaseUrl, supabaseAnonKey)
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export const supabaseServer = createServerClient()

// Helper function to fetch all rows in batches (bypasses 1000 row limit)
export async function fetchAllBikes<T>(
  query: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const BATCH_SIZE = 1000
  const allData: T[] = []
  let from = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await query(from, from + BATCH_SIZE - 1)

    if (error) {
      console.error('Error fetching batch:', error)
      break
    }

    if (data && data.length > 0) {
      allData.push(...data)
      from += BATCH_SIZE
      hasMore = data.length === BATCH_SIZE // If we got full batch, there might be more
    } else {
      hasMore = false
    }
  }

  return allData
}

// Database types
export interface Bike {
  id: number
  brand: string
  model: string
  year: number | null
  price: number | null
  weight: string | null
  category: string
  sub_category: string | null
  frame: string | null
  travel_front: string | null
  travel_rear: string | null
  wheels: string | null
  groupset: string | null
  fork: string | null
  suspension: string | null
  motor: string | null
  battery: string | null
  drivetrain: string | null
  brakes: string | null
  brakes2: string | null
  spokes: string | null
  brake_levers: string | null
  stem: string | null
  handlebar: string | null
  frame_description: string | null
  suspension_fork_description: string | null
  rear_shock_description: string | null
  rear_derailleur: string | null
  front_derailleur: string | null
  shift_levers: string | null
  cassette: string | null
  crank: string | null
  bottom_bracket: string | null
  chain: string | null
  pedals: string | null
  front_hub: string | null
  rear_hub: string | null
  grips: string | null
  saddle: string | null
  seatpost: string | null
  motor3: string | null
  battery4: string | null
  charger: string | null
  rims: string | null
  tires: string | null
  images: string[] | null
  geometry_data: string | null
  size_guide: any | null
  url: string | null
  image_urls: string[] | null
  stack_reach_ratio: number | null
  bottom_bracket_height: number | null
  front_center: number | null
  rake: number | null
  trail: number | null
  stack: number | null
  reach: number | null
  top_tube_length: number | null
  seat_tube_angle: number | null
  seat_tube_length: number | null
  head_tube_angle: number | null
  head_tube_length: number | null
  chainstay_length: number | null
  wheelbase: number | null
  bottom_bracket_drop: number | null
  standover_height: number | null
  rider_min_height: number | null
  rider_max_height: number | null
  title: string | null
  meta_desc: string | null
  slug: string
  fit_flexibility_1_10: number | null
  fit_flexibility_bucket: string | null
  vfm_score_1_to_10: number | null
  vfm_score_bucket: string | null
  build_1_10: number | null
  build_bucket: string | null
  aero_1_10: number | null
  aero_bucket: string | null
  climb_1_10: number | null
  climb_bucket: string | null
  suspension_1_10: number | null
  suspension_bucket: string | null
  posture_1_10: number | null
  posture_bucket: string | null
  torso_angle_deg: number | null
  responsiveness_1_10: number | null
  responsiveness_bucket: string | null
  category_fit: string | null
  speed_index: number | null
  speed_bucket: string | null
  ride_comfort_1_10: number | null
  ride_comfort_bucket: string | null
  surface_range: string | null
  battery_range: string | null
  battery_bucket: string | null
  bike_desc: string | null
  created_at: string
  updated_at: string
  // Pre-calculated scores from CSV
  overall_score: number | null
  performance_score: number | null
  value_score: number | null
  fit_score: number | null
  general_score: number | null
  // SEO
  title_seo: string | null
  // Score explanations (reason columns from CSV)
  fit_reason: string | null
  vfm_reason: string | null
  build_reason: string | null
  aero_reason: string | null
  climb_reason: string | null
  suspension_reason: string | null
  posture_reason: string | null
  responsiveness_reason: string | null
  comfort_reason: string | null
  surface_reason: string | null
  speed_reason: string | null
  battery_reason: string | null
  // Legacy explanation columns (may be deprecated)
  overall_score_explanation: string | null
  performance_score_explanation: string | null
  value_score_explanation: string | null
  fit_score_explanation: string | null
  general_score_explanation: string | null
  climbing_efficiency_explanation: string | null
  aerodynamics_explanation: string | null
  riding_position_explanation: string | null
  handling_explanation: string | null
  fit_flexibility_explanation: string | null
  ride_comfort_explanation: string | null
  build_quality_explanation: string | null
  value_for_money_explanation: string | null
  surface_range_explanation: string | null
  // Allow dynamic access for localized fields (e.g. bike_desc_fr)
  [key: string]: any
}

export interface BikeScore {
  label: string
  score: number | null
  maxScore: number
  description: string
}

export interface BikeMetrics {
  overallScore: number
  performance: BikeScore
  value: BikeScore
  fit: BikeScore
  general: BikeScore
  speed: BikeScore
  climbingEfficiency: BikeScore
  aerodynamics: BikeScore
  ridingPosition: BikeScore
  handling: BikeScore
  fitFlexibility: BikeScore
  rideComfort: BikeScore
  buildQuality: BikeScore
  valueForMoney: BikeScore
  surfaceRange: BikeScore
  battery?: BikeScore
  suspension?: BikeScore
}
