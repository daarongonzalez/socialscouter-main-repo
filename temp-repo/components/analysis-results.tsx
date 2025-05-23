"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SentimentCircle } from "@/components/sentiment-circle"

// Mock data for demonstration
const analysisData = [
  {
    id: 1,
    url: "https://bestreelev...",
    positive: 32,
    neutral: 22,
    negative: 22,
  },
  {
    id: 2,
    url: "https://bestreelev...",
    positive: 32,
    neutral: 22,
    negative: 22,
  },
  {
    id: 3,
    url: "https://bestreelev...",
    positive: 32,
    neutral: 22,
    negative: 22,
  },
  {
    id: 4,
    url: "https://bestreelev...",
    positive: 32,
    neutral: 22,
    negative: 22,
  },
]

export function AnalysisResults() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {analysisData.map((item) => (
        <Card
          key={item.id}
          className="bg-neutral-lightest border-neutral-lighter transition-transform duration-300 ease-in-out hover:scale-[1.01] hover:shadow-md"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-darkest">{item.id}. URL</CardTitle>
            <p className="text-xs text-neutral-dark truncate">url: {item.url}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <SentimentCircle positive={item.positive} neutral={item.neutral} negative={item.negative} />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-neutral-darkest">Scores:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#4CAF50]"></span>
                  <span className="text-xs text-neutral-dark">Positive: {item.positive}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FFB260]"></span>
                  <span className="text-xs text-neutral-dark">Neutral: {item.neutral}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FF5757]"></span>
                  <span className="text-xs text-neutral-dark">Negative: {item.negative}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
