import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { PlatformSelector } from "@/components/platform-selector";
import { UrlInputList } from "@/components/url-input-list";
import { AnalysisResults } from "@/components/analysis-results";
import { SummaryStats } from "@/components/summary-stats";
import { analyzeVideos } from "@/lib/sentiment-api";
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeVideosResponse } from "@shared/schema";

export default function Dashboard() {
  const [contentType, setContentType] = useState<'tiktok' | 'reels' | 'shorts'>('shorts');
  const [urls, setUrls] = useState<string[]>(['', '', '', '', '']);
  const [analysisResults, setAnalysisResults] = useState<AnalyzeVideosResponse | null>(null);
  const { toast } = useToast();

  const analysisMutation = useMutation({
    mutationFn: analyzeVideos,
    onSuccess: (data) => {
      setAnalysisResults(data);
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${data.results.length} videos`,
      });
    },
    onError: (error: any) => {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "An error occurred while analyzing the videos",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    const validUrls = urls.filter(url => url.trim() && /^https?:\/\//.test(url.trim()));
    
    if (validUrls.length === 0) {
      toast({
        title: "No Valid URLs",
        description: "Please enter at least one valid URL",
        variant: "destructive",
      });
      return;
    }

    analysisMutation.mutate({
      urls: validUrls,
      contentType,
      includeTimestamps: false,
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <PlatformSelector
              contentType={contentType}
              onContentTypeChange={setContentType}
            />
            <UrlInputList
              urls={urls}
              onUrlsChange={setUrls}
              contentType={contentType}
            />
            <div className="space-y-4">
              <Button
                onClick={handleAnalyze}
                disabled={analysisMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {analysisMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Videos"
                )}
              </Button>
            </div>
          </div>
          <div className="lg:col-span-3 space-y-6">
            <AnalysisResults results={analysisResults?.results || []} />
            <SummaryStats analysisResults={analysisResults} />
          </div>
        </div>
      </main>
    </div>
  );
}
