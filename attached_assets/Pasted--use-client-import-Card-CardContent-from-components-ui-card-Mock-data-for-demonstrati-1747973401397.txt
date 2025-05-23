"use client"

import { Card, CardContent } from "@/components/ui/card"

// Mock data for demonstration
const overallStats = {
  totalAnalyses: 47,
  totalVideos: 235,
  averageScore: 38,
  description: "Across all your analyzed content, this is your aggregated sentiment score.",
  overallTrend: "+3.2%",
  positiveMentions: "+45%",
  neutralMentions: "+32%",
  negativeMentions: "+23%",
}

export function HistoryOverview() {
  return (
    <Card className="bg-neutral-lightest border-neutral-lighter">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-darkest">Total Average Score:</h3>
            <p className="text-xs text-neutral-dark">{overallStats.description}</p>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold text-neutral-darkest">{overallStats.averageScore}</p>
              <p className="text-sm font-medium text-success pb-1">{overallStats.overallTrend}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <div>
                <h4 className="text-sm font-medium text-neutral-darkest">Total Analyses</h4>
                <p className="text-2xl font-bold text-neutral-darkest">{overallStats.totalAnalyses}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-neutral-darkest">Total Videos</h4>
                <p className="text-2xl font-bold text-neutral-darkest">{overallStats.totalVideos}</p>
              </div>
            </div>

            <div className="h-2 bg-neutral-lighter rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4CAF50] via-[#FFB260] to-[#FF5757]"
                style={{
                  width: "100%",
                  backgroundSize: `${overallStats.positiveMentions} ${overallStats.neutralMentions} ${overallStats.negativeMentions}`,
                }}
              ></div>
            </div>

            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#4CAF50]"></span>
                <span>Positive</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FFB260]"></span>
                <span>Neutral</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FF5757]"></span>
                <span>Negative</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 rounded-lg p-3 flex flex-col justify-center items-center">
              <h3 className="text-xs font-medium text-neutral-darkest text-center">Positive:</h3>
              <p className="text-xl font-bold text-[#4CAF50]">{overallStats.positiveMentions}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3 flex flex-col justify-center items-center">
              <h3 className="text-xs font-medium text-neutral-darkest text-center">Neutral:</h3>
              <p className="text-xl font-bold text-[#FFB260]">{overallStats.neutralMentions}</p>
            </div>

            <div className="bg-red-50 rounded-lg p-3 flex flex-col justify-center items-center">
              <h3 className="text-xs font-medium text-neutral-darkest text-center">Negative:</h3>
              <p className="text-xl font-bold text-[#FF5757]">{overallStats.negativeMentions}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
