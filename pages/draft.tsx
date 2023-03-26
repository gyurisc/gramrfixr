import DraftEditor from '@/components/DraftEditor'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { Head } from 'next/document'
import React from 'react'

function DraftPage() {
    return (
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col pt-8 sm:pt-12">
            <Header />
            <main >
                <DraftEditor words={["framework", "included", "rendering", "editor"]} />
            </main>
            <Footer />
        </ div>
    )
}

export default DraftPage