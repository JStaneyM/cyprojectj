import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const searchTerm = query.trim()
    const terms = searchTerm.split(/\s+/).filter(t => t.length > 0)
    const minimumMatches = terms.length > 3 ? 3 : terms.length
    const seedTerm = [...terms]
      .sort((a, b) => b.replace(/[^a-z0-9]/gi, '').length - a.replace(/[^a-z0-9]/gi, '').length)[0]
    const seedPattern = `%${seedTerm}%`

    const { data: bikes, error } = await supabaseServer
      .from('bike_listings')
      .select('id, brand, model, title, year, category, sub_category, slug, price, primary_image')
      .ilike('title', seedPattern)
      .order('year', { ascending: false })
      .limit(80)

    if (error) {
      console.error('Search suggestions error:', error)
      return NextResponse.json({ suggestions: [], error: error.message }, { status: 500 })
    }

    const filteredBikes = (bikes || []).filter((bike) => {
      const searchableText = (bike.title || '').toLowerCase()
      const matchCount = terms.reduce((count, term) => count + (searchableText.includes(term.toLowerCase()) ? 1 : 0), 0)
      return matchCount >= minimumMatches
    }).slice(0, 8)

    // Format the suggestions
    const suggestions = filteredBikes.map(bike => ({
      id: bike.id,
      label: `${bike.brand} ${bike.model}${bike.year ? ` (${bike.year})` : ''}`,
      brand: bike.brand,
      model: bike.model,
      year: bike.year,
      category: bike.category,
      sub_category: bike.sub_category,
      slug: bike.slug,
      price: bike.price,
      image: bike.primary_image || null,
    })) || []

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json({ suggestions: [], error: 'Internal server error' }, { status: 500 })
  }
}
