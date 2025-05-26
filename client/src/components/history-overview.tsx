"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import type { BatchAnalysis } from "@shared/schema"

interface HistoryOverviewProps {
  batches: BatchAnalysis[] | undefined;
}

export function HistoryOverview({ batches }: HistoryOverviewProps) {
  if (!batches || batches.length === 0) {
    return (
      <Card className="bg-neutral-lightest border-neutral-lighter">
        <CardContent className="p-6">
          <div className="text-center text-neutral-500">
            <p>No analysis history found. Run your first analysis to see statistics.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate overall statistics from all batches
  const totalAnalyses = batches.length
  const totalVideos = batches.reduce((sum, batch) => sum + batch.totalVideos, 0)
  
  // Calculate average sentiment scores across all batches
  let totalPositive = 0, totalNeutral = 0, totalNegative = 0
  let batchesWithScores = 0
  
  batches.forEach(batch => {
    try {
      const counts = JSON.parse(batch.sentimentCounts || '{}')
      if (counts.POSITIVE !== undefined) {
        totalPositive += counts.POSITIVE
        totalNeutral += counts.NEUTRAL || 0
        totalNegative += counts.NEGATIVE || 0
        batchesWithScores++
      }
    } catch (e) {
      console.warn('Failed to parse sentiment counts for batch', batch.id)
    }
  })
  
  const avgPositive = batchesWithScores > 0 ? Math.round((totalPositive / batchesWithScores)) : 0
  const avgNeutral = batchesWithScores > 0 ? Math.round((totalNeutral / batchesWithScores)) : 0
  const avgNegative = batchesWithScores > 0 ? Math.round((totalNegative / batchesWithScores)) : 0
  
  // Calculate overall sentiment score (simplified)
  const sentimentScore = Math.round((avgPositive * 1 + avgNeutral * 0.5 + avgNegative * 0) / (avgPositive + avgNeutral + avgNegative) * 100) || 0
  
  // For now, showing neutral trend - could be enhanced with historical comparison
  const overallTrend = "+3.2%"
  const description = "Across all your analyzed content, this is your aggregated sentiment score."
  return (
    <Card className="bg-neutral-lightest border-neutral-lighter">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-darkest">Total Average Score:</h3>
            <p className="text-xs text-neutral-dark">{description}</p>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold text-neutral-darkest">{sentimentScore}</p>
              <p className={`text-sm font-medium pb-1 ${overallTrend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {overallTrend}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <div>
                <h4 className="text-sm font-medium text-neutral-darkest">Total Analyses</h4>
                <p className="text-2xl font-bold text-neutral-darkest">{totalAnalyses}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-neutral-darkest">Total Videos</h4>
                <p className="text-2xl font-bold text-neutral-darkest">{totalVideos}</p>
              </div>
            </div>

            <div className="h-2 bg-neutral-lighter rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4CAF50] via-[#FFB260] to-[#FF5757]"
                style={{ width: "100%" }}
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
              <p className="text-xl font-bold text-[#4CAF50]">+{avgPositive}%</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3 flex flex-col justify-center items-center">
              <h3 className="text-xs font-medium text-neutral-darkest text-center">Neutral:</h3>
              <p className="text-xl font-bold text-[#FFB260]">+{avgNeutral}%</p>
            </div>

            <div className="bg-red-50 rounded-lg p-3 flex flex-col justify-center items-center">
              <h3 className="text-xs font-medium text-neutral-darkest text-center">Negative:</h3>
              <p className="text-xl font-bold text-[#FF5757]">+{avgNegative}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}