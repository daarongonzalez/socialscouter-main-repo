"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Calendar, ExternalLink } from "lucide-react"
import { SentimentCircle } from "@/components/sentiment-circle"
import { HistoryResultsTable } from "@/components/history-results-table"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import type { BatchAnalysis, AnalysisResult } from "@shared/schema"

interface HistoryListProps {
  batches: BatchAnalysis[] | undefined;
}

export function HistoryList({ batches }: HistoryListProps) {
  const [expandedItems, setExpandedItems] = useState<number[]>([])



  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  if (!batches || batches.length === 0) {

    return (
      <div className="text-center text-neutral-500 py-8">
        <p>No analysis history found. Run your first analysis to see results here.</p>
      </div>
    )
  }

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getPlatformName = (contentType: string) => {
    switch (contentType) {
      case 'tiktok': return 'TikTok'
      case 'reels': return 'Instagram Reels'
      case 'shorts': return 'YouTube Shorts'
      default: return contentType
    }
  }

  const calculateOverallSentiment = (sentimentCounts: string) => {
    try {
      const counts = JSON.parse(sentimentCounts)
      const total = counts.POSITIVE + counts.NEUTRAL + counts.NEGATIVE
      if (total === 0) return { value: "0%", color: "text-neutral-600" }
      
      const positivePercentage = (counts.POSITIVE / total) * 100
      if (positivePercentage > 50) return { value: `+${Math.round(positivePercentage)}%`, color: "text-green-600" }
      else if (positivePercentage < 30) return { value: `-${Math.round(100 - positivePercentage)}%`, color: "text-red-600" }
      else return { value: `${Math.round(positivePercentage)}%`, color: "text-orange-600" }
    } catch {
      return { value: "N/A", color: "text-neutral-600" }
    }
  }

  return (
    <div className="space-y-4">
      {batches.map((batch) => {
        const overallSentiment = calculateOverallSentiment(batch.sentimentCounts || '{}')
        
        return (
          <Card key={batch.id} className="bg-white border-neutral-lighter">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-neutral-dark" />
                  <CardTitle className="text-lg font-medium text-neutral-darkest">
                    {formatDate(batch.createdAt)}
                  </CardTitle>
                  <span className="text-sm text-neutral-dark">• {getPlatformName(batch.contentType)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(batch.id)}
                  className="text-neutral-dark hover:text-neutral-darkest"
                >
                  {expandedItems.includes(batch.id) ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      View Details
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-neutral-dark">Average Score</p>
                    <p className="text-2xl font-bold text-neutral-darkest">{Math.round(batch.avgConfidence)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-dark">Overall Sentiment</p>
                    <p className={`text-2xl font-bold ${overallSentiment.color}`}>
                      {overallSentiment.value}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-dark">URLs Analyzed</p>
                    <p className="text-2xl font-bold text-neutral-darkest">{batch.totalVideos}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-1">
                  <ExternalLink className="h-4 w-4" />
                  Export
                </Button>
              </div>

              {expandedItems.includes(batch.id) && (
                <BatchDetails batchId={batch.id} />
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function BatchDetails({ batchId }: { batchId: number }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  
  const { data: batchData, isLoading } = useQuery({
    queryKey: ['/api/batch', batchId],
    enabled: isAuthenticated && !authLoading, // Only fetch when authenticated
  })

  if (authLoading || isLoading) {
    return (
      <div className="mt-6 text-center">
        <p className="text-neutral-500">Loading batch details...</p>
      </div>
    )
  }

  if (!batchData) {
    return (
      <div className="mt-6 text-center">
        <p className="text-neutral-500">Failed to load batch details.</p>
      </div>
    )
  }

  const { batch, results }: { batch: BatchAnalysis, results: any[] } = batchData

  return (
    <div className="mt-6 space-y-6">
      <HistoryResultsTable results={results} />
    </div>
  )
}