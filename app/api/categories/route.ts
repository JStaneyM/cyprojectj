import { NextResponse } from 'next/server'
import { supabaseServer, fetchAllBikes } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch ALL bikes using batch pagination (bypasses 1000 row limit)
    const bikes = await fetchAllBikes<{ category: string }>(
      async (from, to) => {
        const result = await supabaseServer
          .from('bikes')
          .select('category')
          .range(from, to)
        return result
      }
    )

    console.log('📊 Categories API: Fetched', bikes.length, 'bikes for category counting')

    // Count bikes per category
    const categoryCounts = bikes.reduce((acc, bike) => {
      const cat = bike.category
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Convert to array and sort by count (most bikes first)
    const categories = Object.entries(categoryCounts)
      .map(([name, count]) => ({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '') + 'bikes',
        count,
      }))
      .sort((a, b) => b.count - a.count)

    console.log('📊 Categories found:', categories.map(c => `${c.name} (${c.count})`).join(', '))

    return NextResponse.json({ categories })
  } catch (error: any) {
    console.error('Error in GET /api/categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
