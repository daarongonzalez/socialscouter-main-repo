import { Card, CardContent } from "@/components/ui/card";
import type { AnalyzeVideosResponse } from "@shared/schema";

interface QuickStatsProps {
  analysisResults: AnalyzeVideosResponse | null;
}

export default function QuickStats({ analysisResults }: QuickStatsProps) {
  const stats = analysisResults?.summary || {
    totalVideos: 0,
    totalWords: 0,
    avgConfidence: 0,
    processingTime: 0,
  };

  const formatProcessingTime = (time: number) => {
    return `${time.toFixed(1)}s`;
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Quick Stats</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">Videos Analyzed</span>
            <span className="text-sm font-semibold text-neutral-800">
              {stats.totalVideos}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">Total Words</span>
            <span className="text-sm font-semibold text-neutral-800">
              {stats.totalWords.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">Avg. Confidence</span>
            <span className="text-sm font-semibold text-neutral-800">
              {Math.round(stats.avgConfidence)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">Processing Time</span>
            <span className="text-sm font-semibold text-neutral-800">
              {formatProcessingTime(stats.processingTime)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
