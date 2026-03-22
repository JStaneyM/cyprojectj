import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

interface SearchCandidate {
  id: number
  title: string | null
  brand: string
  model: string
  year: number | null
}

interface SearchBikeRecord extends SearchCandidate {
  price: number | null
  slug: string
  category: string
  sub_category: string | null
  images: string[] | null
  vfm_score_1_to_10: number | null
  build_1_to_10?: number | null
  build_1_10: number | null
  speed_index: number | null
  ride_comfort_1_10: number | null
  frame?: string | null
  performance_score?: number | null
  value_score?: number | null
  posture_1_10?: number | null
  overall_score?: number | null
}

const getSearchTerms = (query: string) =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0)

const getMinimumMatches = (terms: string[]) => (terms.length > 3 ? 3 : terms.length)

const getMatchCount = (title: string, terms: string[]) =>
  terms.reduce((count, term) => count + (title.includes(term) ? 1 : 0), 0)

const sortCandidates = (a: SearchCandidate, b: SearchCandidate, terms: string[]) => {
  const titleA = (a.title || '').toLowerCase()
  const titleB = (b.title || '').toLowerCase()
  const matchDiff = getMatchCount(titleB, terms) - getMatchCount(titleA, terms)

  if (matchDiff !== 0) return matchDiff
  return (b.year || 0) - (a.year || 0)
}

const isStatementTimeout = (error: { message?: string } | null) =>
  !!error?.message && error.message.toLowerCase().includes('statement timeout')

const asSearchBikeRecords = (data: unknown) => (Array.isArray(data) ? data : []) as unknown as SearchBikeRecord[]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const requestedLimit = Number(searchParams.get('limit') || '100')
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 60) : 60

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ bikes: [], total: 0 })
  }

  try {
    const terms = getSearchTerms(query)
    const minimumMatches = getMinimumMatches(terms)
    const normalizedQuery = query.trim().toLowerCase()
    const firstTerm = terms[0]
    const prefixPattern = `${firstTerm}%`
    const wordPattern = `% ${firstTerm}%`
    const orderedPattern = `%${terms.join('%')}%`
    const seedTerm = [...terms]
      .sort((a, b) => b.replace(/[^a-z0-9]/gi, '').length - a.replace(/[^a-z0-9]/gi, '').length)[0]
    const seedPattern = `%${seedTerm}%`
    const normalizedSlugQuery = normalizedQuery.replace(/\s+/g, '-')
    const candidateSelectFields = 'id, brand, model, title, year'
    const finalSelectFields = [
      'id',
      'brand',
      'model',
      'title',
      'year',
      'price',
      'slug',
      'category',
      'sub_category',
      'images',
      'vfm_score_1_to_10',
      'build_1_10',
      'speed_index',
      'ride_comfort_1_10',
      'frame',
      'performance_score',
      'value_score',
      'posture_1_10',
      'overall_score',
    ].join(', ')
    const modelPhrase = terms.slice(1).join(' ')

    let candidates: SearchCandidate[] | null = null
    let searchError = null

    const prefixTitleResult = await supabaseServer
      .from('bikes')
      .select(candidateSelectFields)
      .ilike('title', prefixPattern)
      .limit(80)

    candidates = prefixTitleResult.data
    searchError = prefixTitleResult.error

    if ((!candidates || candidates.length < 18) && !searchError && terms.length > 0) {
      const wordTitleResult = await supabaseServer
        .from('bikes')
        .select(candidateSelectFields)
        .ilike('title', wordPattern)
        .limit(80)

      candidates = [
        ...(candidates || []),
        ...((wordTitleResult.data || []).filter((bike) => !(candidates || []).some((candidate) => candidate.id === bike.id))),
      ]
      searchError = wordTitleResult.error
    }

    if ((!candidates || candidates.length < 18) && !searchError) {
      const orderedTitleResult = await supabaseServer
        .from('bikes')
        .select(candidateSelectFields)
        .ilike('title', orderedPattern)
        .limit(80)

      candidates = [
        ...(candidates || []),
        ...((orderedTitleResult.data || []).filter((bike) => !(candidates || []).some((candidate) => candidate.id === bike.id))),
      ]
      searchError = orderedTitleResult.error
    }

    if ((!candidates || candidates.length < 18) && !searchError) {
      const seedTitleResult = await supabaseServer
        .from('bikes')
        .select(candidateSelectFields)
        .ilike('title', seedPattern)
        .limit(100)

      candidates = [
        ...(candidates || []),
        ...((seedTitleResult.data || []).filter((bike) => !(candidates || []).some((candidate) => candidate.id === bike.id))),
      ]
      searchError = seedTitleResult.error
    }

    if (searchError) {
      if (isStatementTimeout(searchError)) {
        let fallbackBikes: SearchBikeRecord[] = []
        let fallbackError = null

        if (terms.length >= 2) {
          const brandModelResult = await supabaseServer
            .from('bikes')
            .select(finalSelectFields)
            .ilike('brand', `%${firstTerm}%`)
            .ilike('model', `%${modelPhrase}%`)
            .order('year', { ascending: false })
            .limit(60)

          fallbackBikes = asSearchBikeRecords(brandModelResult.data)
          fallbackError = brandModelResult.error
        }

        if ((!fallbackBikes || fallbackBikes.length === 0) && !fallbackError) {
          const modelResult = await supabaseServer
            .from('bikes')
            .select(finalSelectFields)
            .ilike('model', `%${normalizedQuery}%`)
            .order('year', { ascending: false })
            .limit(60)

          fallbackBikes = asSearchBikeRecords(modelResult.data)
          fallbackError = modelResult.error
        }

        if ((!fallbackBikes || fallbackBikes.length === 0) && !fallbackError) {
          const slugResult = await supabaseServer
            .from('bikes')
            .select(finalSelectFields)
            .ilike('slug', `%${normalizedSlugQuery}%`)
            .order('year', { ascending: false })
            .limit(60)

          fallbackBikes = asSearchBikeRecords(slugResult.data)
          fallbackError = slugResult.error
        }

        if (fallbackError) {
          console.error('Search fallback error:', fallbackError)
          return NextResponse.json({ bikes: [], total: 0, error: fallbackError.message }, { status: 500 })
        }

        const filteredFallbackBikes = (fallbackBikes || [])
          .filter((bike) => getMatchCount((bike.title || '').toLowerCase(), terms) >= minimumMatches)
          .sort((a, b) => sortCandidates(a, b, terms))
          .slice(0, limit)
          .map((bike) => ({
            ...bike,
            primary_image: bike.images && bike.images.length > 0 ? bike.images[0] : null,
          }))

        return NextResponse.json({ bikes: filteredFallbackBikes, total: filteredFallbackBikes.length })
      }

      console.error('Search error:', searchError)
      return NextResponse.json({ bikes: [], total: 0, error: searchError.message }, { status: 500 })
    }

    const matchedCandidates = (candidates || [])
      .filter((bike) => {
        const searchableText = (bike.title || '').toLowerCase()
        const matchCount = getMatchCount(searchableText, terms)
        return matchCount >= minimumMatches
      })
      .sort((a, b) => sortCandidates(a, b, terms))

    const finalIds = matchedCandidates.slice(0, limit).map((bike) => bike.id)

    if (finalIds.length === 0) {
      return NextResponse.json({ bikes: [], total: 0 })
    }

    const { data: bikes, error: finalError } = await supabaseServer
      .from('bikes')
      .select(finalSelectFields)
      .in('id', finalIds)

    if (finalError) {
      console.error('Search final fetch error:', finalError)
      return NextResponse.json({ bikes: [], total: 0, error: finalError.message }, { status: 500 })
    }

    const sortOrder = new Map(finalIds.map((id, index) => [id, index]))
    const filteredBikes = asSearchBikeRecords(bikes)
      .sort((a, b) => (sortOrder.get(a.id) || 0) - (sortOrder.get(b.id) || 0))
      .map((bike) => ({
        ...bike,
        primary_image: bike.images && bike.images.length > 0 ? bike.images[0] : null,
      }))

    return NextResponse.json({ bikes: filteredBikes, total: matchedCandidates.length })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ bikes: [], total: 0, error: 'Internal server error' }, { status: 500 })
  }
}
