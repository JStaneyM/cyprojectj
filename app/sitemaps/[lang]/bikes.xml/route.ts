import { supabaseServer } from '@/lib/supabase'
import { buildUrlSetXml, toAbsoluteUrl, xmlResponse } from '@/lib/sitemaps'
import { generateBikeUrl, SUPPORTED_LANGUAGES } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type BikeRow = {
  slug: string
  category: string
  sub_category: string | null
  brand: string
  updated_at: string
}

export async function GET(_: Request, context: { params: { lang: string } }) {
  const lang = SUPPORTED_LANGUAGES.includes(context.params.lang) ? context.params.lang : 'en'

  const { data: bikes } = await supabaseServer
    .from('bikes')
    .select('slug, category, sub_category, brand, updated_at')
    .order('updated_at', { ascending: false })

  const urls = ((bikes as BikeRow[] | null) || []).map((bike) => ({
    loc: toAbsoluteUrl(generateBikeUrl(bike, lang)),
    lastmod: bike.updated_at ? new Date(bike.updated_at).toISOString() : undefined,
  }))

  return xmlResponse(buildUrlSetXml(urls))
}
