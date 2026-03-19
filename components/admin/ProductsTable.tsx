'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProductRow from './ProductRow'

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

interface ProductsTableProps {
    initialBikes: ProductBike[]
}

export default function ProductsTable({ initialBikes }: ProductsTableProps) {
    const router = useRouter()
    const [bikes, setBikes] = useState<ProductBike[]>(initialBikes)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [isDeleting, setIsDeleting] = useState(false)

    const handleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        )
    }

    const handleSelectAll = () => {
        if (selectedIds.length === bikes.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(bikes.map(b => b.id))
        }
    }

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return

        if (!confirm(`Are you sure you want to delete ${selectedIds.length} bikes? This action cannot be undone.`)) {
            return
        }

        setIsDeleting(true)

        try {
            const response = await fetch('/api/admin/bikes/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: selectedIds })
            })

            if (!response.ok) {
                throw new Error('Failed to delete bikes')
            }

            const result = await response.json()

            // Update local state
            setBikes(prev => prev.filter(b => !selectedIds.includes(b.id)))
            setSelectedIds([])

            alert(result.message || 'Deletion successful')
            router.refresh()

        } catch (error: any) {
            console.error('Batch delete failed:', error)
            alert('Failed to delete selected bikes: ' + error.message)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDeleteSuccess = () => {
        router.refresh()
        // Ideally update local state too, but refreshing is safer to stay in sync
        // For now, simple reload or refresh works
        window.location.reload()
    }

    return (
        <div className="space-y-4">
            {/* Batch Actions Toolbar */}
            {selectedIds.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between border border-blue-100 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-blue-900">{selectedIds.length} selected</span>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-sm text-blue-600 hover:text-blue-800 underline ml-2"
                        >
                            Clear selection
                        </button>
                    </div>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isDeleting ? 'Deleting...' : (
                            <>
                                <span>🗑️</span>
                                Delete Selected
                            </>
                        )}
                    </button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={bikes.length > 0 && selectedIds.length === bikes.length}
                                        onChange={handleSelectAll}
                                        disabled={bikes.length === 0}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Image
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Brand & Model
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Year
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Price
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Added
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {bikes.length > 0 ? (
                                bikes.map((bike) => (
                                    <ProductRow
                                        key={bike.id}
                                        bike={bike}
                                        selected={selectedIds.includes(bike.id)}
                                        onSelect={handleSelect}
                                        onDeleteSuccess={handleDeleteSuccess}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        No products found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
