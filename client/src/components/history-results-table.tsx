import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink } from "lucide-react";

interface HistoryResult {
  id: number;
  url: string;
  platform: string;
  sentiment: string;
  confidence: number;
  transcript: string;
  wordCount: number;
  sentimentScores: string;
  commonPositivePhrases: string;
  commonNegativePhrases: string;
  batchId: number;
  createdAt: string;
}

interface HistoryResultsTableProps {
  results: HistoryResult[];
}

export function HistoryResultsTable({ results }: HistoryResultsTableProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toUpperCase()) {
      case 'POSITIVE':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'NEGATIVE':
        return 'bg-red-50 text-red-600 border-red-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'tiktok':
        return '🎵';
      case 'reels':
        return '📸';
      case 'shorts':
        return '📺';
      default:
        return '🎬';
    }
  };

  const getSentimentScores = (sentimentScores: string) => {
    try {
      return JSON.parse(sentimentScores);
    } catch {
      return { positive: 0, neutral: 0, negative: 0 };
    }
  };

  const truncateTranscript = (transcript: string, maxLength: number = 50) => {
    return transcript.length > maxLength ? transcript.substring(0, maxLength) + '...' : transcript;
  };

  const formatPhrases = (phrasesJson: string): string => {
    try {
      const phrases = JSON.parse(phrasesJson);
      return Array.isArray(phrases) && phrases.length > 0 
        ? phrases.slice(0, 2).join(', ') 
        : 'None detected';
    } catch {
      return 'None detected';
    }
  };

  const shortenUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + '/' + urlObj.pathname.split('/').pop();
    } catch {
      return url.substring(0, 50) + '...';
    }
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-800">Detailed Analysis Results</h3>
          <Button variant="outline" size="sm" className="gap-1">
            <ExternalLink className="h-4 w-4" />
            Export All
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Video</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Platform</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Sentiment</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Confidence</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Positive %</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Neutral %</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Negative %</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Positive Phrases</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Negative Phrases</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => {
                const scores = getSentimentScores(result.sentimentScores);
                return (
                  <tr key={result.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Play className="w-4 h-4 text-blue-ribbon" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-neutral-800">Video {index + 1}</span>
                          <span className="text-xs text-neutral-500">{shortenUrl(result.url)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span>{getPlatformIcon(result.platform)}</span>
                        <span className="text-sm text-neutral-600 capitalize">{result.platform}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={`${getSentimentColor(result.sentiment)} border`}
                      >
                        {result.sentiment.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-neutral-200 rounded-full h-2">
                          <div
                            className="bg-blue-ribbon h-2 rounded-full transition-all"
                            style={{ width: `${result.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm text-neutral-600">{Math.round(result.confidence)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full bg-[#4CAF50]"></span>
                        <span className="text-sm font-medium text-green-600">{scores.positive}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full bg-[#FFB260]"></span>
                        <span className="text-sm font-medium text-orange-600">{scores.neutral}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full bg-[#FF5757]"></span>
                        <span className="text-sm font-medium text-red-600">{scores.negative}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-[200px]">
                        <span className="text-sm text-green-700 font-medium">
                          {formatPhrases(result.commonPositivePhrases || '[]')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-[200px]">
                        <span className="text-sm text-red-700 font-medium">
                          {formatPhrases(result.commonNegativePhrases || '[]')}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}