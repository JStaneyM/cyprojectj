import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '16')

  // Calculate offset
  const offset = (page - 1) * limit

  // Convert slug back to category name (e.g., 'roadbikes' -> 'Road')
  const categoryName = category
    .replace(/bikes$/i, '') // Remove 'bikes' at the end
    .trim()

  try {
    // Build query
    let query = supabaseServer
      .from('bikes')
      .select('id, brand, model, year, price, slug, category, sub_category, images, vfm_score_1_to_10, build_1_10, speed_index, overall_score, performance_score, value_score, ride_comfort_1_10, posture_1_10', { count: 'exact' })

    // Add category filter if provided
    if (categoryName) {
      query = query.ilike('category', `%${categoryName}%`)
    }

    const brand = searchParams.get('brand') || ''
    if (brand) {
      query = query.ilike('brand', `%${brand}%`)
    }

    const subcategory = searchParams.get('subcategory') || ''
    if (subcategory) {
      query = query.ilike('sub_category', `%${subcategory}%`)
    }

    // Add ordering and pagination
    const { data, error, count } = await query
      .order('brand', { ascending: true })
      .order('model', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching bikes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)
    const hasMore = page < totalPages

    return NextResponse.json({
      bikes: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/bikes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
