import { Navbar } from "@/components/navbar"
import { PlatformSelector } from "@/components/platform-selector"
import { UrlInputList } from "@/components/url-input-list"
import { AnalysisResults } from "@/components/analysis-results"
import { SummaryStats } from "@/components/summary-stats"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <PlatformSelector />
            <UrlInputList />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <AnalysisResults />
            <SummaryStats />
          </div>
        </div>
      </main>
    </div>
  )
}
