import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import type { AnalysisResult } from "@shared/schema";

interface ResultsTableProps {
  results: AnalysisResult[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
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

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Analysis Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Video</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Platform</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Sentiment</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Confidence</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Transcript</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={result.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <Play className="w-4 h-4 text-blue-ribbon" />
                      <span className="text-sm text-neutral-800">Video {index + 1}</span>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-ribbon hover:text-blue-ribbon/80"
                      onClick={() => {
                        // TODO: Implement transcript modal/drawer
                        alert(`Transcript: ${result.transcript.substring(0, 100)}...`);
                      }}
                    >
                      View transcript
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
