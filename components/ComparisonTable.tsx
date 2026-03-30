'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import englishDict from '@/dictionaries/en.json'
import { useComparison } from '@/context/ComparisonContext'
import { supabase } from '@/lib/supabase'
import { calculateBikeMetrics, formatPrice, generateBikeUrl } from '@/lib/utils'
import type { Bike, BikeMetrics } from '@/lib/supabase'

interface BikeWithMetrics extends Bike {
    metrics: BikeMetrics
}

interface ComparisonTableProps {
    dict?: any
    lang?: string
}

// Helper to determine if we should show a specific row based on bike categories
function shouldShowRow(bikes: BikeWithMetrics[], type: 'battery' | 'suspension' | 'aero') {
    if (type === 'battery') {
        return bikes.some(b => {
            const cat = b.category?.toLowerCase() || ''
            return cat.includes('ebike') || cat.includes('electric') || cat.includes('e-bike')
        })
    }
    if (type === 'suspension') {
        return bikes.some(b => {
            const cat = b.category?.toLowerCase() || ''
            return cat.includes('mountain') || cat.includes('mtb')
        })
    }
    if (type === 'aero') {
        return bikes.some(b => {
            const cat = b.category?.toLowerCase() || ''
            return !cat.includes('mountain') && !cat.includes('mtb') // Show aero for non-MTB (Road, Gravel, etc)
        })
    }
    return true
}

export default function ComparisonTable({ dict, lang = 'en' }: ComparisonTableProps) {
    const { selectedBikes, removeFromCompare, clearCompare } = useComparison()
    const [bikes, setBikes] = useState<BikeWithMetrics[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchBikes = async () => {
            if (selectedBikes.length === 0) {
                setBikes([])
                setLoading(false)
                return
            }

            setLoading(true)
            const ids = selectedBikes.map(b => b.id)

            const { data, error } = await supabase
                .from('bikes')
                .select('*')
                .in('id', ids)

            if (error) {
                console.error('Error fetching comparison bikes:', error)
                setLoading(false)
                return
            }

            if (data) {
                // Enforce order based on selectedBikes
                const orderedBikes = ids.map(id => data.find(b => b.id === id)).filter(Boolean) as Bike[]

                const bikesWithMetrics = orderedBikes.map(bike => ({
                    ...bike,
                    metrics: calculateBikeMetrics(bike)
                }))
                setBikes(bikesWithMetrics)
            }
            setLoading(false)
        }

        fetchBikes()
    }, [selectedBikes])

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (bikes.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{dict?.compare_page?.no_bikes || 'No bikes selected'}</h2>
                <p className="text-gray-600 mb-6">{dict?.compare_page?.subtitle || 'Select up to 4 bikes to compare.'}</p>
                <Link
                    href={`/${lang}`}
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                    {dict?.compare_page?.browse_bikes || 'Browse Bikes'}
                </Link>
            </div>
        )
    }

    // Helper to translate keys
    const t = (key: string) => {
        if (!key) return ''
        return key.split('.').reduce((o: any, i) => (o ? o[i] : null), dict) || key
    }

    const findDictionaryPathByValue = (node: any, target: string, currentPath = ''): string | null => {
        if (!node || typeof node !== 'object') return null

        for (const [key, value] of Object.entries(node)) {
            const nextPath = currentPath ? `${currentPath}.${key}` : key

            if (typeof value === 'string' && value === target) return nextPath
            if (value && typeof value === 'object') {
                const nestedMatch = findDictionaryPathByValue(value, target, nextPath)
                if (nestedMatch) return nestedMatch
            }
        }

        return null
    }

    const translateLookupValue = (value?: string | null) => {
        if (!value) return ''
        if (value.includes('.')) return t(value)

        const bucketPath = findDictionaryPathByValue((englishDict as any).buckets, value, 'buckets')
        if (bucketPath) return t(bucketPath)

        return value
    }

    // Helper to render score row
    const ScoreRow = ({
        label,
        metricKey,
        isBold = false,
        hideDescription = false,
        customValueFn,
        translateCustomValue = false
    }: {
        label: string,
        metricKey: keyof BikeMetrics,
        isBold?: boolean,
        hideDescription?: boolean,
        customValueFn?: (bike: BikeWithMetrics) => string | undefined,
        translateCustomValue?: boolean
    }) => (
        <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <td className={`py-4 px-4 text-sm text-gray-600 ${isBold ? 'font-bold' : ''}`}>{label}</td>
            {bikes.map(bike => {
                // @ts-ignore
                const metric = bike.metrics[metricKey]
                // Handle nested score object or direct value if any
                const score = typeof metric === 'object' && metric?.score ? metric.score : metric

                // For battery, we might want to show custom value (range)
                const customVal = customValueFn ? customValueFn(bike) : undefined

                const descKey = typeof metric === 'object' && metric?.description ? metric.description : ''
                const desc = hideDescription ? null : translateLookupValue(descKey)

                if (!metric && metricKey === 'battery') return <td key={bike.id} className="py-4 px-4 text-center">-</td>
                if (!metric && metricKey === 'suspension') return <td key={bike.id} className="py-4 px-4 text-center">-</td>
                if (!metric && metricKey === 'aerodynamics') return <td key={bike.id} className="py-4 px-4 text-center">-</td>


                // Calculate display values and styles
                const isScoreNumber = typeof score === 'number'
                const displayValue = customVal
                    ? (translateCustomValue ? translateLookupValue(customVal) : customVal)
                    : (isScoreNumber ? score.toFixed(1) : '-')

                let colorClass = 'text-red-600'
                if (customVal) {
                    colorClass = 'text-gray-900'
                } else if (isScoreNumber) {
                    if (score >= 8.5) colorClass = 'text-green-600'
                    else if (score >= 7) colorClass = 'text-blue-600'
                    else if (score >= 5.5) colorClass = 'text-yellow-600'
                }

                return (
                    <td key={bike.id} className="py-4 px-4 text-center">
                        {(isScoreNumber || customVal) ? (
                            <div className="flex flex-col items-center">
                                <span className={`text-lg font-bold ${colorClass}`}>
                                    {displayValue}
                                </span>
                                {desc && <span className="text-xs text-gray-500 mt-1">{desc}</span>}
                            </div>
                        ) : '-'}
                    </td>
                )
            })}
        </tr>
    )

    // Helper to render spec row
    const SpecRow = ({ label, field }: { label: string, field: keyof Bike }) => (
        <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <td className="py-4 px-4 text-sm text-gray-600 font-medium">{label}</td>
            {bikes.map(bike => (
                <td key={bike.id} className="py-4 px-4 text-center text-sm text-gray-800">
                    {/* @ts-ignore */}
                    {bike[field] ? String(bike[field]) : '-'}
                </td>
            ))}
        </tr>
    )

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header Controls */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-semibold text-gray-700">{dict?.compare_page?.title || 'Comparing'} {bikes.length} {dict?.filters?.bikes || 'Bikes'}</h2>
                <button
                    onClick={clearCompare}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                    {dict?.compare_page?.clear_all || 'Clear All'}
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                    <thead>
                        <tr className="border-b border-gray-200 bg-white">
                            <th className="w-48 py-4 px-4 text-left text-sm font-semibold text-gray-500">{dict?.filters?.model || 'Model'}</th>
                            {bikes.map(bike => (
                                <th key={bike.id} className="w-64 py-6 px-4 align-top">
                                    <div className="relative group isolate">
                                        <button
                                            onClick={() => removeFromCompare(bike.id)}
                                            className="absolute -top-3 -right-3 bg-white hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-full p-2 shadow-md border border-gray-100 z-50 transition-all opacity-100"
                                            title={dict?.common?.remove_from_compare || "Remove"}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>

                                        <div className="aspect-video relative rounded-lg overflow-hidden mb-4 bg-gray-100">
                                            {bike.images?.[0] ? (
                                                <Image
                                                    src={bike.images[0]}
                                                    alt={bike.model}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    No Image
                                                </div>
                                            )}
                                        </div>
                                        <Link
                                            href={generateBikeUrl(bike, lang)}
                                            className="block text-lg font-bold text-gray-900 hover:text-blue-600 mb-1"
                                        >
                                            {bike.model}
                                        </Link>
                                        <p className="text-gray-600 font-medium mb-2">{bike.brand}</p>
                                        <p className="text-xl font-bold text-blue-600">
                                            {formatPrice(bike.price, lang)}
                                        </p>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Scores Section */}
                        <tr className="bg-gray-50">
                            <td colSpan={bikes.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {dict?.scores?.summary_title || 'Scores'}
                            </td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 bg-blue-50/30">
                            <td className="py-4 px-4 text-sm font-bold text-gray-800">{dict?.scores?.overall || 'Overall Score'}</td>
                            {bikes.map(bike => (
                                <td key={bike.id} className="py-4 px-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-2xl font-bold text-gray-900">{bike.metrics.overallScore.toFixed(1)}</span>
                                    </div>
                                </td>
                            ))}
                        </tr>
                        <ScoreRow label={dict?.scores?.performance || 'Performance'} metricKey="performance" hideDescription={true} />
                        <ScoreRow label={dict?.scores?.value || 'Value'} metricKey="value" hideDescription={true} />
                        <ScoreRow label={dict?.scores?.fit || 'Fit'} metricKey="fit" hideDescription={true} />

                        {/* Breakdown */}
                        <tr className="bg-gray-50">
                            <td colSpan={bikes.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Performance Details
                            </td>
                        </tr>
                        <ScoreRow label={dict?.scores?.speed || 'Speed'} metricKey="speed" />
                        <ScoreRow label={dict?.scores?.climbing || 'Climbing Efficiency'} metricKey="climbingEfficiency" />
                        {shouldShowRow(bikes, 'aero') && <ScoreRow label={dict?.scores?.aerodynamics || 'Aerodynamics'} metricKey="aerodynamics" />}
                        {shouldShowRow(bikes, 'suspension') && <ScoreRow label={dict?.scores?.suspension || 'Suspension'} metricKey="suspension" />}

                        <tr className="bg-gray-50">
                            <td colSpan={bikes.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Value & Build
                            </td>
                        </tr>
                        <ScoreRow label={dict?.scores?.build_quality || 'Build Quality'} metricKey="buildQuality" />
                        <ScoreRow label={dict?.scores?.value_for_money || 'Value for Money'} metricKey="valueForMoney" />
                        <ScoreRow label={dict?.scores?.surface_range || 'Surface Range'} metricKey="surfaceRange" hideDescription={true} customValueFn={(bike) => bike.surface_range || undefined} translateCustomValue={true} />
                        {shouldShowRow(bikes, 'battery') && <ScoreRow label={dict?.scores?.battery || 'Battery'} metricKey="battery" customValueFn={(bike) => bike.battery_range || undefined} />}

                        <tr className="bg-gray-50">
                            <td colSpan={bikes.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Fit & Comfort
                            </td>
                        </tr>
                        <ScoreRow label={dict?.scores?.riding_position || 'Riding Position'} metricKey="ridingPosition" />
                        <ScoreRow label={dict?.scores?.handling || 'Handling'} metricKey="handling" />
                        <ScoreRow label={dict?.scores?.fit_flexibility || 'Fit Flexibility'} metricKey="fitFlexibility" />
                        <ScoreRow label={dict?.scores?.ride_comfort || 'Ride Comfort'} metricKey="rideComfort" />

                        {/* Specs Section */}
                        <tr className="bg-gray-50">
                            <td colSpan={bikes.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {dict?.common?.specifications || 'Key Specs'}
                            </td>
                        </tr>
                        <SpecRow label={dict?.filters?.year || "Year"} field="year" />
                        <SpecRow label={dict?.filters?.frame_material || "Frame Material"} field="frame" />
                        <SpecRow label={dict?.specs?.groupset || 'Groupset'} field="groupset" />
                        <SpecRow label={dict?.specs?.weight || 'Weight'} field="weight" />
                        <SpecRow label={dict?.specs?.wheels || 'Wheels'} field="wheels" />

                        {/* Drivetrain Section */}
                        <tr className="bg-gray-50">
                            <td colSpan={bikes.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Drivetrain
                            </td>
                        </tr>
                        <SpecRow label={dict?.specs?.crank || 'Crank'} field="crank" />
                        <SpecRow label={dict?.specs?.cassette || 'Cassette'} field="cassette" />
                        <SpecRow label={dict?.specs?.rear_derailleur || 'Rear Derailleur'} field="rear_derailleur" />

                        {/* Components Section */}
                        <tr className="bg-gray-50">
                            <td colSpan={bikes.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Components
                            </td>
                        </tr>
                        <SpecRow label={dict?.specs?.brakes || 'Brakes'} field="brakes" />
                        <SpecRow label={dict?.specs?.handlebar || 'Handlebar'} field="handlebar" />
                        <SpecRow label={dict?.specs?.saddle || 'Saddle'} field="saddle" />
                        <SpecRow label={dict?.specs?.tires || 'Tires'} field="tires" />

                    </tbody>
                </table>
            </div>
        </div>
    )
}
