import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

interface SearchCandidate {
  id: number
  title: string | null
  brand: string
  model: string
  year: number | null
}

interface SearchSuggestionRecord extends SearchCandidate {
  category: string
  sub_category: string | null
  slug: string
  price: number | null
  images: string[] | null
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

const asSearchSuggestionRecords = (data: unknown) => (Array.isArray(data) ? data : []) as unknown as SearchSuggestionRecord[]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] })
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
    const suggestionSelectFields = 'id, brand, model, title, year, category, sub_category, slug, price, images'
    const modelPhrase = terms.slice(1).join(' ')

    let candidates: SearchCandidate[] | null = null
    let error = null

    const prefixTitleResult = await supabaseServer
      .from('bikes')
      .select(candidateSelectFields)
      .ilike('title', prefixPattern)
      .limit(60)

    candidates = prefixTitleResult.data
    error = prefixTitleResult.error

    if ((!candidates || candidates.length < 12) && !error && terms.length > 0) {
      const wordTitleResult = await supabaseServer
        .from('bikes')
        .select(candidateSelectFields)
        .ilike('title', wordPattern)
        .limit(60)

      candidates = [
        ...(candidates || []),
        ...((wordTitleResult.data || []).filter((bike) => !(candidates || []).some((candidate) => candidate.id === bike.id))),
      ]
      error = wordTitleResult.error
    }

    if ((!candidates || candidates.length < 12) && !error) {
      const orderedTitleResult = await supabaseServer
        .from('bikes')
        .select(candidateSelectFields)
        .ilike('title', orderedPattern)
        .limit(60)

      candidates = [
        ...(candidates || []),
        ...((orderedTitleResult.data || []).filter((bike) => !(candidates || []).some((candidate) => candidate.id === bike.id))),
      ]
      error = orderedTitleResult.error
    }

    if ((!candidates || candidates.length < 12) && !error) {
      const seedTitleResult = await supabaseServer
        .from('bikes')
        .select(candidateSelectFields)
        .ilike('title', seedPattern)
        .limit(80)

      candidates = [
        ...(candidates || []),
        ...((seedTitleResult.data || []).filter((bike) => !(candidates || []).some((candidate) => candidate.id === bike.id))),
      ]
      error = seedTitleResult.error
    }

    if (error) {
      if (isStatementTimeout(error)) {
        let fallbackBikes: SearchSuggestionRecord[] = []
        let fallbackError = null

        if (terms.length >= 2) {
          const brandModelResult = await supabaseServer
            .from('bikes')
            .select(suggestionSelectFields)
            .ilike('brand', `%${firstTerm}%`)
            .ilike('model', `%${modelPhrase}%`)
            .order('year', { ascending: false })
            .limit(20)

          fallbackBikes = asSearchSuggestionRecords(brandModelResult.data)
          fallbackError = brandModelResult.error
        }

        if ((!fallbackBikes || fallbackBikes.length === 0) && !fallbackError) {
          const modelResult = await supabaseServer
            .from('bikes')
            .select(suggestionSelectFields)
            .ilike('model', `%${normalizedQuery}%`)
            .order('year', { ascending: false })
            .limit(20)

          fallbackBikes = asSearchSuggestionRecords(modelResult.data)
          fallbackError = modelResult.error
        }

        if ((!fallbackBikes || fallbackBikes.length === 0) && !fallbackError) {
          const slugResult = await supabaseServer
            .from('bikes')
            .select(suggestionSelectFields)
            .ilike('slug', `%${normalizedSlugQuery}%`)
            .order('year', { ascending: false })
            .limit(20)

          fallbackBikes = asSearchSuggestionRecords(slugResult.data)
          fallbackError = slugResult.error
        }

        if (fallbackError) {
          console.error('Search suggestions fallback error:', fallbackError)
          return NextResponse.json({ suggestions: [], error: fallbackError.message }, { status: 500 })
        }

        const suggestions = (fallbackBikes || [])
          .filter((bike) => getMatchCount((bike.title || '').toLowerCase(), terms) >= minimumMatches)
          .sort((a, b) => sortCandidates(a, b, terms))
          .slice(0, 8)
          .map((bike) => ({
            id: bike.id,
            label: `${bike.brand} ${bike.model}${bike.year ? ` (${bike.year})` : ''}`,
            brand: bike.brand,
            model: bike.model,
            year: bike.year,
            category: bike.category,
            sub_category: bike.sub_category,
            slug: bike.slug,
            price: bike.price,
            image: bike.images && bike.images.length > 0 ? bike.images[0] : null,
          }))

        return NextResponse.json({ suggestions })
      }

      console.error('Search suggestions error:', error)
      return NextResponse.json({ suggestions: [], error: error.message }, { status: 500 })
    }

    const matchedCandidates = (candidates || [])
      .filter((bike) => {
        const searchableText = (bike.title || '').toLowerCase()
        const matchCount = getMatchCount(searchableText, terms)
        return matchCount >= minimumMatches
      })
      .sort((a, b) => sortCandidates(a, b, terms))

    const finalIds = matchedCandidates.slice(0, 8).map((bike) => bike.id)

    if (finalIds.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const { data: bikes, error: finalError } = await supabaseServer
      .from('bikes')
      .select(suggestionSelectFields)
      .in('id', finalIds)

    if (finalError) {
      console.error('Search suggestions final fetch error:', finalError)
      return NextResponse.json({ suggestions: [], error: finalError.message }, { status: 500 })
    }

    const sortOrder = new Map(finalIds.map((id, index) => [id, index]))
    const finalBikes = asSearchSuggestionRecords(bikes)
      .sort((a, b) => (sortOrder.get(a.id) || 0) - (sortOrder.get(b.id) || 0))

    const suggestions = finalBikes.map(bike => ({
      id: bike.id,
      label: `${bike.brand} ${bike.model}${bike.year ? ` (${bike.year})` : ''}`,
      brand: bike.brand,
      model: bike.model,
      year: bike.year,
      category: bike.category,
      sub_category: bike.sub_category,
      slug: bike.slug,
      price: bike.price,
      image: bike.images && bike.images.length > 0 ? bike.images[0] : null,
    })) || []

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json({ suggestions: [], error: 'Internal server error' }, { status: 500 })
  }
}
