'use client'

import { useComparison, ComparisonBike } from '@/context/ComparisonContext'
import { getDictionary } from '@/lib/dictionaries'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AddToCompareButtonProps {
    bike: ComparisonBike
    variant?: 'icon' | 'button' | 'full'
    className?: string
}

export default function AddToCompareButton({ bike, variant = 'button', className = '' }: AddToCompareButtonProps) {
    const { addToCompare, removeFromCompare, isInCompare, selectedBikes } = useComparison()
    const isSelected = isInCompare(bike.id)
    const params = useParams()
    const lang = (params?.lang as string) || 'en'
    const [labels, setLabels] = useState({
        addToCompare: 'Add to Compare',
        removeFromCompare: 'Remove from Compare',
        added: 'Added',
    })

    useEffect(() => {
        getDictionary(lang).then((dict) => {
            setLabels({
                addToCompare: dict.common?.add_to_compare || 'Add to Compare',
                removeFromCompare: dict.common?.remove_from_compare || 'Remove from Compare',
                added: dict.common?.added || 'Added',
            })
        })
    }, [lang])

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault() // Prevent navigation if used inside a Link
        e.stopPropagation()

        if (isSelected) {
            removeFromCompare(bike.id)
        } else {
            addToCompare(bike)
        }
    }

    if (variant === 'icon') {
        return (
            <button
                onClick={handleToggle}
                className={`p-2 rounded-full transition-colors ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                    } ${className}`}
                title={isSelected ? labels.removeFromCompare : labels.addToCompare}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
            </button>
        )
    }

    if (variant === 'full') {
        return (
            <button
                onClick={handleToggle}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isSelected
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    } ${className}`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
                {isSelected ? labels.removeFromCompare : labels.addToCompare}
            </button>
        )
    }

    return (
        <button
            onClick={handleToggle}
            className={`text-sm font-medium transition-colors flex items-center gap-1 ${isSelected ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                } ${className}`}
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            {isSelected ? labels.added : labels.addToCompare}
        </button>
    )
}
