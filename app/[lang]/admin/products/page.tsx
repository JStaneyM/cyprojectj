import Link from 'next/link'
import { supabaseServer, fetchAllBikes } from '@/lib/supabase'
import ProductsTable from '@/components/admin/ProductsTable'

// Force dynamic rendering - always fetch fresh data
export const dynamic = 'force-dynamic'

type ProductBike = {
  id: number
  brand: string
  model: string
  slug: string
  category: string
  sub_category: string | null
  price: number | null
  images: string[] | null
  year: number
  created_at: string
}

export default async function ProductsPage() {
  // Fetch ALL bikes using batch pagination (bypasses 1000 row limit)
  const bikesList = await fetchAllBikes<ProductBike>(
    async (from, to) => {
        const result = await supabaseServer
          .from('bikes')
          .select('id, brand, model, slug, category, sub_category, price, images, year, created_at')
          .order('created_at', { ascending: false })
          .range(from, to)
      return result
    }
  )

  console.log('📊 Admin Products: Fetched', bikesList.length, 'bikes')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-600">Manage your bike inventory</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/products/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            Add Product
          </Link>
          <Link
            href="/admin/products/upload"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <span>📤</span>
            Upload CSV
          </Link>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{bikesList.length}</div>
          <div className="text-sm text-gray-600">Total Products</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">
            {Array.from(new Set(bikesList.map(b => b.category))).length}
          </div>
          <div className="text-sm text-gray-600">Categories</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">
            {Array.from(new Set(bikesList.map(b => b.brand))).length}
          </div>
          <div className="text-sm text-gray-600">Brands</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">
            {bikesList.filter(b => b.price).length}
          </div>
          <div className="text-sm text-gray-600">Priced Items</div>
        </div>
      </div>

      {/* Products Table (Client Component) */}
      <ProductsTable initialBikes={bikesList} />
    </div>
  )
}
