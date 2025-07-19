import { Navbar } from "@/components/navbar"
import { HistoryOverview } from "@/components/history-overview"
import { HistoryList } from "@/components/history-list"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import type { BatchAnalysis } from "@shared/schema"

export default function HistoryPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  
  const { data: batches, isLoading, error } = useQuery({
    queryKey: ['/api/history'],
    enabled: isAuthenticated && !authLoading, // Only fetch when fully authenticated
  })



  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="container mx-auto p-6">
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-neutral-darkest">Analysis History</h1>
            <div className="text-center py-8">
              <p className="text-neutral-500">Loading your analysis history...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="container mx-auto p-6">
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-neutral-darkest">Analysis History</h1>
            <div className="text-center py-8">
              <p className="text-red-500">Failed to load analysis history. Please try again.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-neutral-darkest">Analysis History</h1>
          <HistoryOverview batches={batches} />
          <HistoryList batches={batches} />
        </div>
      </main>
    </div>
  )
}