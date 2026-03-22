import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('bikes')
      .select('count')
      .limit(1)

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
      }, { status: 500 })
    }

    // Check if bikes table has data (use regular select instead of count)
    const { data: bikes, error: countError } = await supabase
      .from('bikes')
      .select('id')
      .limit(1)

    const bikesCount = bikes ? bikes.length : 0

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      bikesCount: bikesCount > 0 ? 'Data available' : 0,
      message: bikesCount === 0 ? 'Database connected but no bikes imported yet. Run: npm run import-data' : 'All systems operational',
      note: 'Visit / to see the homepage',
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
