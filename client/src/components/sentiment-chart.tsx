import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart } from "lucide-react";
import type { AnalyzeVideosResponse } from "@shared/schema";

interface SentimentChartProps {
  analysisResults: AnalyzeVideosResponse | null;
}

export default function SentimentChart({ analysisResults }: SentimentChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!analysisResults || !canvasRef.current) return;

    const loadChart = async () => {
      // Dynamically import Chart.js to avoid SSR issues
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const { sentimentCounts } = analysisResults.summary;
      const total = sentimentCounts.POSITIVE + sentimentCounts.NEUTRAL + sentimentCounts.NEGATIVE;

      if (total === 0) return;

      const data = [
        sentimentCounts.POSITIVE,
        sentimentCounts.NEUTRAL,
        sentimentCounts.NEGATIVE,
      ];

      chartRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Positive', 'Neutral', 'Negative'],
          datasets: [{
            data,
            backgroundColor: ['#10B981', '#6B7280', '#EF4444'],
            borderWidth: 0,
            cutout: '60%',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const percentage = Math.round((context.parsed / total) * 100);
                  return `${context.label}: ${percentage}%`;
                }
              }
            }
          },
        },
      });
    };

    loadChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [analysisResults]);

  const getSentimentPercentages = () => {
    if (!analysisResults) return { positive: 0, neutral: 0, negative: 0 };
    
    const { sentimentCounts } = analysisResults.summary;
    const total = sentimentCounts.POSITIVE + sentimentCounts.NEUTRAL + sentimentCounts.NEGATIVE;
    
    if (total === 0) return { positive: 0, neutral: 0, negative: 0 };
    
    return {
      positive: Math.round((sentimentCounts.POSITIVE / total) * 100),
      neutral: Math.round((sentimentCounts.NEUTRAL / total) * 100),
      negative: Math.round((sentimentCounts.NEGATIVE / total) * 100),
    };
  };

  const percentages = getSentimentPercentages();

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Sentiment Overview</h3>
        <div className="relative h-64 flex items-center justify-center">
          {analysisResults ? (
            <canvas ref={canvasRef} className="max-w-full max-h-full" />
          ) : (
            <div className="text-center text-neutral-400">
              <PieChart className="w-12 h-12 mx-auto mb-3" />
              <p>Start analysis to see results</p>
            </div>
          )}
        </div>
        {analysisResults && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-neutral-700">Positive</span>
              </div>
              <span className="text-sm font-medium text-neutral-800">{percentages.positive}%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                <span className="text-sm text-neutral-700">Neutral</span>
              </div>
              <span className="text-sm font-medium text-neutral-800">{percentages.neutral}%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-neutral-700">Negative</span>
              </div>
              <span className="text-sm font-medium text-neutral-800">{percentages.negative}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
