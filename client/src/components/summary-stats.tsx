"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { AnalyzeVideosResponse } from "@shared/schema"

interface SummaryStatsProps {
  analysisResults: AnalyzeVideosResponse | null;
}

export function SummaryStats({ analysisResults }: SummaryStatsProps) {
  if (!analysisResults) {
    return (
      <Card className="bg-neutral-100 border-neutral-200">
        <CardContent className="p-6">
          <div className="text-center text-neutral-500">
            <p>Run an analysis to see summary statistics</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { summary } = analysisResults
  const { sentimentCounts, sentimentScores, avgConfidence, totalVideos, totalWords } = summary

  // Use the new sentiment score averages if available, fallback to counts
  // Format to 1 decimal place to prevent container overflow
  const positivePercentage = Number((sentimentScores?.positive ?? 0).toFixed(1))
  const neutralPercentage = Number((sentimentScores?.neutral ?? 0).toFixed(1))
  const negativePercentage = Number((sentimentScores?.negative ?? 0).toFixed(1))

  return (
    <Card className="bg-neutral-100 border-neutral-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-neutral-800">Average Score:</h3>
            <p className="text-xs text-neutral-600">Sentiment scores across analyzed videos</p>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-4 md:col-span-1 bg-blue-50 rounded-lg p-4 flex flex-col justify-center items-center min-h-[120px]">
              <h3 className="text-sm font-medium text-neutral-800 text-center mb-2 break-words">Videos Analyzed:</h3>
              <p className="text-3xl md:text-4xl font-bold text-blue-600 break-words text-center">{totalVideos}</p>
            </div>

            <div className="col-span-4 md:col-span-1 bg-green-50 rounded-lg p-4 flex flex-col justify-center items-center min-h-[120px]">
              <h3 className="text-sm font-medium text-neutral-800 text-center mb-2 break-words">Positive:</h3>
              <p className="text-3xl md:text-4xl font-bold text-[#4CAF50] break-words text-center">
                {positivePercentage}%
              </p>
            </div>

            <div className="col-span-4 md:col-span-1 bg-yellow-50 rounded-lg p-4 flex flex-col justify-center items-center min-h-[120px]">
              <h3 className="text-sm font-medium text-neutral-800 text-center mb-2 break-words">Neutral:</h3>
              <p className="text-3xl md:text-4xl font-bold text-[#FFB260] break-words text-center">
                {neutralPercentage}%
              </p>
            </div>

            <div className="col-span-4 md:col-span-1 bg-red-50 rounded-lg p-4 flex flex-col justify-center items-center min-h-[120px]">
              <h3 className="text-sm font-medium text-neutral-800 text-center mb-2 break-words">Negative:</h3>
              <p className="text-3xl md:text-4xl font-bold text-[#FF5757] break-words text-center">
                {negativePercentage}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}