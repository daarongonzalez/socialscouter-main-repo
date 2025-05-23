"use client"

import { Card, CardContent } from "@/components/ui/card"

// Mock data for demonstration
const summaryData = {
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
}

export function SummaryStats() {
  return (
    <Card className="bg-neutral-lightest border-neutral-lighter">
      <CardContent className="p-6">
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-6 md:col-span-1">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-neutral-darkest">Average Score:</h3>
              <p className="text-xs text-neutral-dark">{summaryData.averageScore.description}</p>
              <p className="text-4xl font-bold text-neutral-darkest">{summaryData.averageScore.value}</p>
            </div>
          </div>

          <div className="col-span-6 md:col-span-1 bg-blue-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <h3 className="text-sm font-medium text-neutral-darkest text-center">Product Mentions:</h3>
            <p className="text-4xl font-bold text-blue-ribbon">{summaryData.productMentions.value}</p>
          </div>

          <div className="col-span-6 md:col-span-1 bg-green-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <h3 className="text-sm font-medium text-neutral-darkest text-center">Positive Mentions:</h3>
            <p className={`text-4xl font-bold ${summaryData.positiveMentions.color}`}>
              {summaryData.positiveMentions.value}
            </p>
          </div>

          <div className="col-span-6 md:col-span-1 bg-yellow-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <h3 className="text-sm font-medium text-neutral-darkest text-center">Neutral Mentions:</h3>
            <p className={`text-4xl font-bold ${summaryData.neutralMentions.color}`}>
              {summaryData.neutralMentions.value}
            </p>
          </div>

          <div className="col-span-6 md:col-span-1 bg-red-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <h3 className="text-sm font-medium text-neutral-darkest text-center">Negative Mentions:</h3>
            <p className={`text-4xl font-bold ${summaryData.negativeMentions.color}`}>
              {summaryData.negativeMentions.value}
            </p>
          </div>

          <div className="col-span-6 md:col-span-1 bg-purple-50 rounded-lg p-4 flex flex-col justify-center items-center">
            <h3 className="text-sm font-medium text-neutral-darkest text-center">Overall Sentiment:</h3>
            <p className={`text-4xl font-bold ${summaryData.overallSentiment.color}`}>
              {summaryData.overallSentiment.value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
