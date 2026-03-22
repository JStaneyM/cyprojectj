import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { ComparisonProvider } from '@/context/ComparisonContext'
import { SITE_URL } from '@/lib/site'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: {
        template: '%s | MatchBikes',
        default: 'MatchBikes - Premium Bicycle Catalog'
    },
    description: 'Discover the perfect bike from our extensive catalog of road bikes, mountain bikes, and more.',
    metadataBase: new URL(SITE_URL),
}

// Generate static params for languages
export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'de' }]
}

export default async function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: { lang: string }
}) {
    return (
        <html lang={params.lang || 'en'} suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <ComparisonProvider>
                    <Header />
                    {children}
                    <Footer lang={params.lang || 'en'} />
                </ComparisonProvider>
            </body>
        </html>
    )
}
