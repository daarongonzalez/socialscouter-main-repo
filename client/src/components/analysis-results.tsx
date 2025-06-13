"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SentimentCircle } from "@/components/sentiment-circle"
import type { AnalysisResult } from "@shared/schema"

interface AnalysisResultsProps {
  results: AnalysisResult[];
}

export function AnalysisResults({ results }: AnalysisResultsProps) {
  const getSentimentPercentages = (result: AnalysisResult) => {
    // Try to use stored sentiment scores if available
    if (result.sentimentScores) {
      try {
        const scores = JSON.parse(result.sentimentScores);
        return {
          positive: Math.round(scores.positive || 0),
          neutral: Math.round(scores.neutral || 0),
          negative: Math.round(scores.negative || 0)
        };
      } catch (e) {
        console.warn('Failed to parse sentiment scores:', e);
      }
    }
    
    // Fallback to confidence-based calculation
    const confidence = result.confidence;
    
    switch (result.sentiment.toUpperCase()) {
      case 'POSITIVE':
        return { 
          positive: Math.max(60, confidence), 
          neutral: Math.max(10, (100 - confidence) / 2), 
          negative: Math.max(5, (100 - confidence) / 2) 
        }
      case 'NEGATIVE':
        return { 
          positive: Math.max(5, (100 - confidence) / 2), 
          neutral: Math.max(10, (100 - confidence) / 2), 
          negative: Math.max(60, confidence) 
        }
      default: // NEUTRAL
        return { 
          positive: Math.max(5, (100 - confidence) / 3), 
          neutral: Math.max(60, confidence), 
          negative: Math.max(5, (100 - confidence) / 3) 
        }
    }
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">No analysis results yet. Add some URLs and click analyze to get started!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {results.map((result, index) => {
        const percentages = getSentimentPercentages(result)
        
        return (
          <Card
            key={result.id}
            className="bg-neutral-100 border-neutral-200 transition-transform duration-300 ease-in-out hover:scale-[1.01] hover:shadow-md"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-800">{index + 1}. URL</CardTitle>
              <p className="text-xs text-neutral-600 truncate">url: {result.url.substring(0, 20)}...</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <SentimentCircle 
                positive={percentages.positive} 
                neutral={percentages.neutral} 
                negative={percentages.negative} 
              />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-neutral-800">Scores:</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#4CAF50]"></span>
                    <span className="text-xs text-neutral-600">Positive: {Math.round(percentages.positive)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FFB260]"></span>
                    <span className="text-xs text-neutral-600">Neutral: {Math.round(percentages.neutral)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FF5757]"></span>
                    <span className="text-xs text-neutral-600">Negative: {Math.round(percentages.negative)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}