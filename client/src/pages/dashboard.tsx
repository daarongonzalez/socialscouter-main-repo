import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { BarChart3, User, Loader2 } from "lucide-react";
import ContentTypeFilter from "@/components/content-type-filter";
import URLInputs from "@/components/url-inputs";
import SentimentChart from "@/components/sentiment-chart";
import ResultsTable from "@/components/results-table";
import QuickStats from "@/components/quick-stats";
import { analyzeVideos } from "@/lib/sentiment-api";
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeVideosResponse } from "@shared/schema";

export default function Dashboard() {
  const [contentType, setContentType] = useState<'tiktok' | 'reels' | 'shorts'>('tiktok');
  const [urls, setUrls] = useState<string[]>(['', '', '', '', '']);
  const [includeTimestamps, setIncludeTimestamps] = useState(false);
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
      includeTimestamps,
    });
  };

  return (
    <div className="bg-neutral-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-ribbon rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-800">SocialScouter</h1>
                <p className="text-xs text-neutral-500">Sentiment Analysis Tool</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-neutral-600">
                <span className="font-medium">Credits remaining:</span>{" "}
                <span className="text-blue-ribbon font-semibold">247</span>
              </div>
              <Button size="sm" variant="ghost" className="w-8 h-8 p-0 rounded-full">
                <User className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-neutral-800 mb-2">Batch Sentiment Analysis</h2>
          <p className="text-neutral-600 text-lg">
            Analyze sentiment from short-form video transcripts across TikTok, Instagram Reels, and YouTube Shorts
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Type Filter */}
            <ContentTypeFilter
              contentType={contentType}
              onContentTypeChange={setContentType}
            />

            {/* URL Input Fields */}
            <URLInputs
              urls={urls}
              onUrlsChange={setUrls}
              contentType={contentType}
            />

            {/* Analysis Controls */}
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-800 mb-1">Analysis Settings</h3>
                    <p className="text-sm text-neutral-600">Configure sentiment analysis parameters</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-timestamps"
                        checked={includeTimestamps}
                        onCheckedChange={(checked) => setIncludeTimestamps(checked as boolean)}
                      />
                      <label htmlFor="include-timestamps" className="text-sm text-neutral-700">
                        Include timestamps
                      </label>
                    </div>
                    <Button
                      onClick={handleAnalyze}
                      disabled={analysisMutation.isPending}
                      className="bg-blue-ribbon hover:bg-blue-ribbon/90 text-white"
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
              </CardContent>
            </Card>

            {/* Results Table */}
            {analysisResults && (
              <ResultsTable results={analysisResults.results} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sentiment Overview Chart */}
            <SentimentChart analysisResults={analysisResults} />

            {/* Quick Stats */}
            <QuickStats analysisResults={analysisResults} />

            {/* Usage Information */}
            <Card className="bg-tree-poppy-50 border-tree-poppy-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-tree-poppy text-white flex items-center justify-center text-xs font-bold mt-1">
                    i
                  </div>
                  <div>
                    <h4 className="font-semibold text-tree-poppy-800 mb-2">How it works</h4>
                    <ul className="text-sm text-tree-poppy-700 space-y-1">
                      <li>• Select your content platform</li>
                      <li>• Paste up to 5 video URLs</li>
                      <li>• Click "Analyze Videos"</li>
                      <li>• View sentiment results</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
