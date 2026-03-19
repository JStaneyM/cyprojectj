'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useParams, usePathname } from 'next/navigation'
import Image from 'next/image'
import { useComparison } from '@/context/ComparisonContext'
import LanguageSwitcher from './LanguageSwitcher'
import { generateBikeUrl } from '@/lib/utils'

interface Category {
  name: string
  slug: string
  count: number
}

interface SearchSuggestion {
  id: number
  label: string
  brand: string
  model: string
  year: number | null
  category: string
  sub_category: string | null
  slug: string
  price: number | null
  image: string | null
}

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSort, setSearchSort] = useState('year')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname() // Need usePathname imported

  // Robustly determine current language
  const getLangFromPath = () => {
    if (params?.lang) return params.lang as string
    const segment = pathname?.split('/')?.[1]
    const validLangs = ['en', 'de', 'fr', 'es', 'it', 'nl']
    return validLangs.includes(segment) ? segment : 'en'
  }
  const lang = getLangFromPath()

  const { selectedBikes } = useComparison()

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.categories) {
          // Take top 5 categories by count for the header
          setCategories(data.categories.slice(0, 5))
        }
      })
      .catch(err => console.error('Error fetching categories:', err))
  }, [])

  // Fetch search suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      setIsLoadingSuggestions(true)
      try {
        const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(searchQuery)}`)
        const data = await response.json()
        if (data.suggestions) {
          setSuggestions(data.suggestions)
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error('Error fetching search suggestions:', error)
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    const debounceTimer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isOutsideDesktop = searchRef.current && !searchRef.current.contains(target)
      const isOutsideMobile = mobileSearchRef.current && !mobileSearchRef.current.contains(target)

      if (isOutsideDesktop && isOutsideMobile) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/${lang}/search?q=${encodeURIComponent(searchQuery.trim())}&sort=${searchSort}`)
      setSearchQuery('')
      setIsSearchOpen(false)
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    const newUrl = generateBikeUrl(suggestion, lang)
    router.push(newUrl)
    setSearchQuery('')
    setShowSuggestions(false)
    setIsSearchOpen(false)
  }

  const formatPrice = (price: number | null) => {
    if (!price) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Format category name for display (shorten if needed)
  const formatCategoryName = (name: string) => {
    const lower = name.toLowerCase().replace(/[-\s]/g, '') // Remove dashes and spaces for comparison

    // Check for e-bike mountain variants (must check BEFORE generic e-bike)
    if (lower.includes('ebikemountain') || lower.includes('emtb')) {
      return 'E-MTB'
    }
    // Check for e-bike road variants
    if (lower.includes('ebikeroad') || lower.includes('eroad')) {
      return 'E-Road'
    }
    // Generic e-bike (only if not mountain or road)
    if (lower.includes('ebike') || lower.includes('electric')) {
      return 'E-Bike'
    }

    // Return the name as-is for simple categories
    return name
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-gray-700 hover:text-blue-600 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Logo */}
            <Link href={`/${lang}`} className="flex items-center">
              <Image
                src="/logo/Matchbikes%20logo-2.png"
                alt="MatchBikes"
                width={565}
                height={148}
                priority
                className="h-8 w-auto max-w-[180px] md:h-10 md:max-w-[240px] lg:h-11 lg:max-w-[280px]"
              />
            </Link>
          </div>

          {/* Desktop Navigation - Dynamic Categories */}
          <nav className="hidden md:flex items-center gap-6 ml-6 lg:ml-8">
            {categories.length > 0 ? (
              categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/${lang}/${category.slug}`}
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                  title={`${category.name} (${category.count} bikes)`}
                >
                  {formatCategoryName(category.name)}
                </Link>
              ))
            ) : (
              // Fallback while loading
              <>
                <span className="text-gray-400">Road</span>
                <span className="text-gray-400">Mountain</span>
                <span className="text-gray-400">E-Bike</span>
              </>
            )}
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-xl mx-6" ref={searchRef}>
            <form onSubmit={handleSearch} className="flex relative">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                  placeholder="Search bikes..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-l-lg border-r-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Search Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-[44rem] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        {suggestion.image ? (
                          <Image
                            src={suggestion.image}
                            alt={suggestion.label}
                            width={50}
                            height={50}
                            className="object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{suggestion.label}</p>
                          <p className="text-xs text-gray-500">{suggestion.sub_category || suggestion.category}</p>
                        </div>
                        {suggestion.price && (
                          <div className="text-sm font-semibold text-gray-700">
                            {formatPrice(suggestion.price)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading State */}
                {isLoadingSuggestions && searchQuery.trim().length >= 2 && (
                  <div className="absolute top-full left-0 mt-2 w-[44rem] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
                    <p className="text-sm text-gray-500 text-center">Searching...</p>
                  </div>
                )}

                {/* No Results State */}
                {showSuggestions && !isLoadingSuggestions && suggestions.length === 0 && searchQuery.trim().length >= 2 && (
                  <div className="absolute top-full left-0 mt-2 w-[44rem] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
                    <p className="text-sm text-gray-500 text-center">No bikes found. Try a different search term.</p>
                  </div>
                )}
              </div>
              <div className="relative">
                <select
                  value={searchSort}
                  onChange={(e) => setSearchSort(e.target.value)}
                  className="h-full pl-3 pr-8 bg-gray-50 border border-gray-300 border-l-0 rounded-r-lg text-sm focus:outline-none focus:ring-0 text-gray-700 cursor-pointer w-[140px] appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.65em auto' }}
                >
                  <option value="year">Newest</option>
                  <option value="value">Best Value</option>
                  <option value="performance">Performance</option>
                  <option value="comfort">Comfort</option>
                  <option value="position">Position</option>
                </select>
              </div>
            </form>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden text-gray-700 hover:text-blue-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Mobile Compare Button (Icon with badge) */}
            <Link
              href={`/${lang}/compare`}
              className="md:hidden relative text-gray-700 hover:text-blue-600 font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              {selectedBikes.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {selectedBikes.length}
                </span>
              )}
            </Link>


            {/* Admin Link & Compare Link (Desktop) */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher />

              {/* Compare Link */}
              <Link
                href={`/${lang}/compare`}
                className="relative text-gray-700 hover:text-blue-600 font-medium transition-colors flex items-center gap-1"
              >
                Compare
                {selectedBikes.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {selectedBikes.length}
                  </span>
                )}
              </Link>


            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="md:hidden pb-4" ref={mobileSearchRef}>
            <form onSubmit={handleSearch} className="flex relative">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                  placeholder="Search..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-l-lg border-r-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Mobile Search Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        {suggestion.image ? (
                          <Image
                            src={suggestion.image}
                            alt={suggestion.label}
                            width={50}
                            height={50}
                            className="object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{suggestion.label}</p>
                          <p className="text-xs text-gray-500">{suggestion.sub_category || suggestion.category}</p>
                        </div>
                        {suggestion.price && (
                          <div className="text-sm font-semibold text-gray-700">
                            {formatPrice(suggestion.price)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <select
                  value={searchSort}
                  onChange={(e) => setSearchSort(e.target.value)}
                  className="h-full pl-3 pr-8 bg-gray-50 border border-gray-300 border-l-0 rounded-r-lg text-sm focus:outline-none focus:ring-0 text-gray-700 cursor-pointer w-[120px] appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.65em auto' }}
                >
                  <option value="year">Newest</option>
                  <option value="value">Value</option>
                  <option value="performance">Perf.</option>
                  <option value="comfort">Comfort</option>
                  <option value="position">Position</option>
                </select>
              </div>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 animate-fadeIn">
            <nav className="flex flex-col gap-4">
              <Link
                href={`/${lang}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-medium text-gray-800"
              >
                Home
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/${lang}/${category.slug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-gray-800"
                >
                  {formatCategoryName(category.name)}
                </Link>
              ))}
              <Link
                href={`/${lang}/compare`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-medium text-gray-800 flex items-center justify-between"
              >
                Compare
                {selectedBikes.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {selectedBikes.length}
                  </span>
                )}
              </Link>
              <div className="pt-4 border-t border-gray-100">
                <div className="mb-2 text-sm text-gray-500">Language</div>
                <LanguageSwitcher />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
