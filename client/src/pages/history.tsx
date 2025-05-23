import { Navbar } from "@/components/navbar"
import { HistoryOverview } from "@/components/history-overview"
import { HistoryList } from "@/components/history-list"

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-neutral-darkest">Analysis History</h1>
          <HistoryOverview />
          <HistoryList />
        </div>
      </main>
    </div>
  )
}