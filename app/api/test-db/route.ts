import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Testing database connection...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    // Test 1: Try to fetch bikes
    const { data: bikes, error: bikesError } = await supabase
      .from('bikes')
      .select('id, brand, model, slug')
      .limit(5)

    console.log('Bikes query result:', { bikes, error: bikesError })

    // Test 2: Try to get count
    const { count, error: countError } = await supabase
      .from('bikes')
      .select('*', { count: 'exact', head: true })

    console.log('Count query result:', { count, error: countError })

    return NextResponse.json({
      test1_fetch: {
        success: !bikesError,
        error: bikesError?.message,
        data: bikes,
        count: bikes?.length || 0,
      },
      test2_count: {
        success: !countError,
        error: countError?.message,
        totalCount: count,
      },
      diagnose: {
        rlsIssue: bikesError?.message?.includes('policy') || bikesError?.message?.includes('permission'),
        suggestion: bikesError ? 'RLS policy may be blocking access. Check Supabase Authentication settings.' : 'Everything looks good!',
      }
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
