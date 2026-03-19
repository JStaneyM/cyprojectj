'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { formatPrice, generateBikeUrl } from '@/lib/utils'

interface ProductBike {
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

interface ProductRowProps {
  bike: ProductBike
  selected?: boolean
  onSelect?: (id: number) => void
  onDeleteSuccess?: () => void
}

export default function ProductRow({ bike, selected, onSelect, onDeleteSuccess }: ProductRowProps) {
  const params = useParams()
  const lang = (params?.lang as string) || 'en'

  const handleDelete = async () => {
    if (!confirm(`Delete ${bike.brand} ${bike.model}? This cannot be undone.`)) {
      return
    }

    try {
      console.log('🗑️ Deleting bike:', bike.id, bike.brand, bike.model)

      const response = await fetch(`/api/admin/bikes/${bike.id}`, {
        method: 'DELETE',
      })

      console.log('📡 Delete response status:', response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ Delete failed:', error)
        throw new Error(error.error || 'Failed to delete bike')
      }

      const result = await response.json()
      console.log('✅ Delete successful:', result)

      // Show success message briefly
      alert(`Successfully deleted ${bike.brand} ${bike.model}`)

      // Call success callback to refresh list
      if (onDeleteSuccess) {
        onDeleteSuccess()
      } else {
        window.location.reload()
      }
    } catch (error: any) {
      console.error('❌ Delete error:', error)
      alert(`Error deleting bike: ${error.message}\n\nThis might be due to database permissions. Check the browser console for details.`)
    }
  }

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${selected ? 'bg-blue-50' : ''}`}>
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={selected || false}
          onChange={() => onSelect && onSelect(bike.id)}
          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      </td>
      <td className="px-6 py-4">
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          {bike.images && bike.images.length > 0 ? (
            <Image
              src={bike.images[0]}
              alt={`${bike.brand} ${bike.model}`}
              width={64}
              height={64}
              className="object-contain"
            />
          ) : (
            <span className="text-gray-400 text-xs">No image</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div>
          <div className="font-semibold text-gray-900">{bike.brand}</div>
          <div className="text-sm text-gray-600">{bike.model}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {bike.category}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">{bike.year}</td>
      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
        {bike.price ? formatPrice(bike.price) : 'N/A'}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {new Date(bike.created_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-3">
          <Link
            href={generateBikeUrl(bike, lang)}
            target="_blank"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            View
          </Link>
          <Link
            href={`/admin/products/${bike.id}/edit`}
            className="text-green-600 hover:text-green-700 font-medium text-sm"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 font-medium text-sm"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}
