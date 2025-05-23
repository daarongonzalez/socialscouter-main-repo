"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Calendar, ExternalLink } from "lucide-react"
import { SentimentCircle } from "@/components/sentiment-circle"

// Mock data for demonstration
const historyData = [
  {
    id: 1,
    date: "May 21, 2025",
    platform: "Youtube Shorts",
    urls: [
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
        positive: 35,
        neutral: 20,
        negative: 20,
      },
      {
        id: 3,
        url: "https://bestreelev...",
        positive: 30,
        neutral: 25,
        negative: 20,
      },
      {
        id: 4,
        url: "https://bestreelev...",
        positive: 40,
        neutral: 15,
        negative: 20,
      },
    ],
    summaryData: {
      averageScore: {
        value: 35,
        description: "Across these URLs this is your aggregated sentiment score.",
      },
      productMentions: {
        value: 35,
      },
      positiveMentions: {
        value: "+42%",
        color: "text-[#4CAF50]",
      },
      neutralMentions: {
        value: "+27%",
        color: "text-[#FFB260]",
      },
      negativeMentions: {
        value: "+12%",
        color: "text-[#FF5757]",
      },
      overallSentiment: {
        value: "+5%",
        color: "text-[#4CAF50]",
      },
    },
  },
  {
    id: 2,
    date: "May 18, 2025",
    platform: "TikTok",
    urls: [
      {
        id: 1,
        url: "https://bestreelev...",
        positive: 28,
        neutral: 25,
        negative: 22,
      },
      {
        id: 2,
        url: "https://bestreelev...",
        positive: 30,
        neutral: 22,
        negative: 23,
      },
      {
        id: 3,
        url: "https://bestreelev...",
        positive: 25,
        neutral: 30,
        negative: 20,
      },
      {
        id: 4,
        url: "https://bestreelev...",
        positive: 32,
        neutral: 20,
        negative: 23,
      },
    ],
    summaryData: {
      averageScore: {
        value: 32,
        description: "Across these URLs this is your aggregated sentiment score.",
      },
      productMentions: {
        value: 28,
      },
      positiveMentions: {
        value: "+38%",
        color: "text-[#4CAF50]",
      },
      neutralMentions: {
        value: "+32%",
        color: "text-[#FFB260]",
      },
      negativeMentions: {
        value: "+15%",
        color: "text-[#FF5757]",
      },
      overallSentiment: {
        value: "+3%",
        color: "text-[#4CAF50]",
      },
    },
  },
  {
    id: 3,
    date: "May 15, 2025",
    platform: "Instagram Reels",
    urls: [
      {
        id: 1,
        url: "https://bestreelev...",
        positive: 40,
        neutral: 20,
        negative: 15,
      },
      {
        id: 2,
        url: "https://bestreelev...",
        positive: 42,
        neutral: 18,
        negative: 15,
      },
      {
        id: 3,
        url: "https://bestreelev...",
        positive: 38,
        neutral: 22,
        negative: 15,
      },
      {
        id: 4,
        url: "https://bestreelev...",
        positive: 45,
        neutral: 15,
        negative: 15,
      },
    ],
    summaryData: {
      averageScore: {
        value: 42,
        description: "Across these URLs this is your aggregated sentiment score.",
      },
      productMentions: {
        value: 45,
      },
      positiveMentions: {
        value: "+52%",
        color: "text-[#4CAF50]",
      },
      neutralMentions: {
        value: "+22%",
        color: "text-[#FFB260]",
      },
      negativeMentions: {
        value: "+8%",
        color: "text-[#FF5757]",
      },
      overallSentiment: {
        value: "+12%",
        color: "text-[#4CAF50]",
      },
    },
  },
]

export function HistoryList() {
  const [expandedItems, setExpandedItems] = useState<number[]>([])

  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-4">
      {historyData.map((item) => (
        <Card key={item.id} className="bg-white border-neutral-lighter">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neutral-dark" />
                <CardTitle className="text-lg font-medium text-neutral-darkest">{item.date}</CardTitle>
                <span className="text-sm text-neutral-dark">• {item.platform}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpand(item.id)}
                className="text-neutral-dark hover:text-neutral-darkest"
              >
                {expandedItems.includes(item.id) ? (
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
                  <p className="text-2xl font-bold text-neutral-darkest">{item.summaryData.averageScore.value}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-dark">Overall Sentiment</p>
                  <p className={`text-2xl font-bold ${item.summaryData.overallSentiment.color}`}>
                    {item.summaryData.overallSentiment.value}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-dark">URLs Analyzed</p>
                  <p className="text-2xl font-bold text-neutral-darkest">{item.urls.length}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-4 w-4" />
                Export
              </Button>
            </div>

            {expandedItems.includes(item.id) && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {item.urls.map((url) => (
                    <Card
                      key={url.id}
                      className="bg-neutral-lightest border-neutral-lighter transition-transform duration-300 ease-in-out hover:scale-[1.01] hover:shadow-md"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-darkest">{url.id}. URL</CardTitle>
                        <p className="text-xs text-neutral-dark truncate">url: {url.url}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <SentimentCircle positive={url.positive} neutral={url.neutral} negative={url.negative} />
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-neutral-darkest">Scores:</h4>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-[#4CAF50]"></span>
                              <span className="text-xs text-neutral-dark">Positive: {url.positive}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-[#FFB260]"></span>
                              <span className="text-xs text-neutral-dark">Neutral: {url.neutral}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-[#FF5757]"></span>
                              <span className="text-xs text-neutral-dark">Negative: {url.negative}%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-neutral-lightest border-neutral-lighter">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-6 gap-4">
                      <div className="col-span-6 md:col-span-1">
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium text-neutral-darkest">Average Score:</h3>
                          <p className="text-xs text-neutral-dark">{item.summaryData.averageScore.description}</p>
                          <p className="text-4xl font-bold text-neutral-darkest">
                            {item.summaryData.averageScore.value}
                          </p>
                        </div>
                      </div>

                      <div className="col-span-6 md:col-span-1 bg-blue-50 rounded-lg p-4 flex flex-col justify-center items-center">
                        <h3 className="text-sm font-medium text-neutral-darkest text-center">Product Mentions:</h3>
                        <p className="text-4xl font-bold text-blue-ribbon">{item.summaryData.productMentions.value}</p>
                      </div>

                      <div className="col-span-6 md:col-span-1 bg-green-50 rounded-lg p-4 flex flex-col justify-center items-center">
                        <h3 className="text-sm font-medium text-neutral-darkest text-center">Positive Mentions:</h3>
                        <p className={`text-4xl font-bold ${item.summaryData.positiveMentions.color}`}>
                          {item.summaryData.positiveMentions.value}
                        </p>
                      </div>

                      <div className="col-span-6 md:col-span-1 bg-yellow-50 rounded-lg p-4 flex flex-col justify-center items-center">
                        <h3 className="text-sm font-medium text-neutral-darkest text-center">Neutral Mentions:</h3>
                        <p className={`text-4xl font-bold ${item.summaryData.neutralMentions.color}`}>
                          {item.summaryData.neutralMentions.value}
                        </p>
                      </div>

                      <div className="col-span-6 md:col-span-1 bg-red-50 rounded-lg p-4 flex flex-col justify-center items-center">
                        <h3 className="text-sm font-medium text-neutral-darkest text-center">Negative Mentions:</h3>
                        <p className={`text-4xl font-bold ${item.summaryData.negativeMentions.color}`}>
                          {item.summaryData.negativeMentions.value}
                        </p>
                      </div>

                      <div className="col-span-6 md:col-span-1 bg-purple-50 rounded-lg p-4 flex flex-col justify-center items-center">
                        <h3 className="text-sm font-medium text-neutral-darkest text-center">Overall Sentiment:</h3>
                        <p className={`text-4xl font-bold ${item.summaryData.overallSentiment.color}`}>
                          {item.summaryData.overallSentiment.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}