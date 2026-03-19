'use client'

import { useState, ReactNode, Children, cloneElement, isValidElement, useEffect } from 'react'
import { getDictionary } from '@/lib/dictionaries'
import { useParams } from 'next/navigation'

interface ScoreSectionWithToggleProps {
  title: string
  subtitle?: string
  children: ReactNode
  gridCols?: string
  containerClassName?: string
}

export default function ScoreSectionWithToggle({ title, subtitle, children, gridCols = 'grid-cols-3', containerClassName = '' }: ScoreSectionWithToggleProps) {
  const [showAllExplanations, setShowAllExplanations] = useState(false)
  const [labels, setLabels] = useState({
    showExplanations: 'Show Explanations',
    hideExplanations: 'Hide Explanations',
  })
  const params = useParams()
  const lang = (params?.lang as string) || 'en'

  useEffect(() => {
    getDictionary(lang).then((dict) => {
      setLabels({
        showExplanations: dict.common?.show_explanations || 'Show Explanations',
        hideExplanations: dict.common?.hide_explanations || 'Hide Explanations',
      })
    })
  }, [lang])

  // Clone children and pass expanded state to ScoreCard components
  const clonedChildren = Children.map(children, (child) => {
    if (isValidElement(child)) {
      return cloneElement(child as React.ReactElement<any>, {
        isExpanded: showAllExplanations,
        onToggle: () => setShowAllExplanations(!showAllExplanations)
      })
    }
    return child
  })

  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        <button
          onClick={() => setShowAllExplanations(!showAllExplanations)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          {showAllExplanations ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {labels.hideExplanations}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {labels.showExplanations}
            </>
          )}
        </button>
      </div>
      <div className={`${containerClassName} grid ${gridCols} gap-4`}>
        {clonedChildren}
      </div>
    </div>
  )
}
