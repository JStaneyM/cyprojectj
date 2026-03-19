'use client'

import ScoreCard from './ScoreCard'
import { getDictionary } from '@/lib/dictionaries'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface InteractiveScoreSummaryProps {
    metrics: any
    bike: any
}

export default function InteractiveScoreSummary({ metrics, bike }: InteractiveScoreSummaryProps) {
    const params = useParams()
    const lang = (params?.lang as string) || 'en'
    const [summaryTitle, setSummaryTitle] = useState('Score Summary')

    useEffect(() => {
        getDictionary(lang).then((dict) => {
            setSummaryTitle(dict.scores?.summary_title || 'Score Summary')
        })
    }, [lang])

    const summaryCards = [
        {
            key: 'performance',
            label: metrics.performance.label,
            score: metrics.performance.score,
            maxScore: metrics.performance.maxScore,
            description: undefined,
            variant: 'primary' as const,
            metricType: 'performance' as const,
        },
        {
            key: 'value',
            label: metrics.value.label,
            score: metrics.value.score,
            maxScore: metrics.value.maxScore,
            description: undefined,
            metricType: 'value' as const,
        },
        {
            key: 'fit',
            label: metrics.fit.label,
            score: metrics.fit.score,
            maxScore: metrics.fit.maxScore,
            description: undefined,
            metricType: 'fit' as const,
        },
        ...(bike.general_score !== null && bike.general_score !== undefined ? [{
            key: 'general',
            label: metrics.general.label,
            score: metrics.general.score,
            maxScore: metrics.general.maxScore,
            description: metrics.general.description,
            metricType: 'general' as const,
        }] : []),
    ].filter((card) => card.score !== null && card.score !== undefined)

    const desktopGridClass = {
        1: 'lg:grid-cols-1',
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
    }[summaryCards.length] || 'lg:grid-cols-4'

    return (
        <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{summaryTitle}</h2>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${desktopGridClass} gap-4`}>
                {summaryCards.map((card) => (
                    <ScoreCard
                        key={card.key}
                        label={card.label}
                        score={card.score}
                        maxScore={card.maxScore}
                        description={card.description}
                        variant={card.variant}
                        metricType={card.metricType}
                    />
                ))}
            </div>
        </div>
    )
}
