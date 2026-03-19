import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ bikes: [], total: 0 })
  }

  try {
    const terms = query.trim().split(/\s+/).filter(t => t.length > 0)
    const minimumMatches = terms.length > 3 ? 3 : terms.length
    const seedTerm = [...terms]
      .sort((a, b) => b.replace(/[^a-z0-9]/gi, '').length - a.replace(/[^a-z0-9]/gi, '').length)[0]
    const seedPattern = `%${seedTerm}%`

    const { data: bikes, error: searchError } = await supabaseServer
      .from('bike_listings')
      .select('id, brand, model, title, year, price, slug, category, sub_category, primary_image')
      .ilike('title', seedPattern)
      .order('year', { ascending: false })
      .limit(120)

    if (searchError) {
      console.error('Search error:', searchError)
      return NextResponse.json({ bikes: [], total: 0, error: searchError.message }, { status: 500 })
    }

    const filteredBikes = (bikes || []).filter((bike) => {
      const searchableText = (bike.title || '').toLowerCase()
      const matchCount = terms.reduce((count, term) => count + (searchableText.includes(term.toLowerCase()) ? 1 : 0), 0)
      return matchCount >= minimumMatches
    })

    return NextResponse.json({ bikes: filteredBikes, total: filteredBikes.length })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ bikes: [], total: 0, error: 'Internal server error' }, { status: 500 })
  }
}
