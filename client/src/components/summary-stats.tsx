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
  const { sentimentCounts, avgConfidence, totalVideos, totalWords } = summary

  const total = sentimentCounts.POSITIVE + sentimentCounts.NEUTRAL + sentimentCounts.NEGATIVE
  const positivePercentage = total > 0 ? Math.round((sentimentCounts.POSITIVE / total) * 100) : 0
  const neutralPercentage = total > 0 ? Math.round((sentimentCounts.NEUTRAL / total) * 100) : 0
  const negativePercentage = total > 0 ? Math.round((sentimentCounts.NEGATIVE / total) * 100) : 0

  return (
    <Card className="bg-neutral-100 border-neutral-200">
      <CardContent className="p-6">
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-6 md:col-span-1">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-neutral-800">Average Score:</h3>
              <p className="text-xs text-neutral-600">Confidence across analyzed videos</p>
              <p className="text-4xl font-bold text-neutral-800">{Math.round(avgConfidence)}</p>
            </div>
          </div>

          <div className="col-span-6 md:col-span-1 bg-blue-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <h3 className="text-sm font-medium text-neutral-800 text-center">Videos Analyzed:</h3>
            <p className="text-4xl font-bold text-blue-600">{totalVideos}</p>
          </div>

          <div className="col-span-6 md:col-span-1 bg-green-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <h3 className="text-sm font-medium text-neutral-800 text-center">Positive:</h3>
            <p className="text-4xl font-bold text-[#4CAF50]">
              {positivePercentage}%
            </p>
          </div>

          <div className="col-span-6 md:col-span-1 bg-yellow-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <h3 className="text-sm font-medium text-neutral-800 text-center">Neutral:</h3>
            <p className="text-4xl font-bold text-[#FFB260]">
              {neutralPercentage}%
            </p>
          </div>

          <div className="col-span-6 md:col-span-1 bg-red-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <h3 className="text-sm font-medium text-neutral-800 text-center">Negative:</h3>
            <p className="text-4xl font-bold text-[#FF5757]">
              {negativePercentage}%
            </p>
          </div>

          <div className="col-span-6 md:col-span-1 bg-purple-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <h3 className="text-sm font-medium text-neutral-800 text-center">Total Words:</h3>
            <p className="text-4xl font-bold text-purple-600">
              {totalWords.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}