import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeVideosSchema, type AnalyzeVideosRequest, type AnalyzeVideosResponse } from "@shared/schema";
import { ZodError } from "zod";
import { TranscriptService } from "./lib/transcript-service";
import { SentimentService } from "./lib/sentiment-service";

export async function registerRoutes(app: Express): Promise<Server> {
  const transcriptService = new TranscriptService();
  const sentimentService = new SentimentService();

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Analyze videos endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Validate request body
      const validationResult = analyzeVideosSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validationResult.error.issues
        });
      }

      const { urls, contentType, includeTimestamps } = validationResult.data;

      // Process each video URL
      const results = [];
      let totalWords = 0;
      let totalConfidence = 0;
      const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
      let totalPositiveScore = 0;
      let totalNeutralScore = 0;
      let totalNegativeScore = 0;

      for (const url of urls) {
        try {
          // Get transcript from video URL
          const transcript = await transcriptService.getTranscript(url, contentType);
          
          if (!transcript) {
            console.warn(`Failed to get transcript for URL: ${url}`);
            continue;
          }

          // Analyze sentiment
          const sentimentResult = await sentimentService.analyzeSentiment(transcript);
          
          console.log(`Sentiment result for ${url}:`, {
            sentiment: sentimentResult.sentiment,
            confidence: sentimentResult.confidence,
            scores: sentimentResult.scores
          });
          
          // Count words
          const wordCount = transcript.split(/\s+/).length;
          totalWords += wordCount;
          totalConfidence += sentimentResult.confidence;
          sentimentCounts[sentimentResult.sentiment as keyof typeof sentimentCounts]++;

          // Aggregate sentiment scores if available
          if (sentimentResult.scores) {
            totalPositiveScore += sentimentResult.scores.positive;
            totalNeutralScore += sentimentResult.scores.neutral;
            totalNegativeScore += sentimentResult.scores.negative;
          } else {
            // Fallback: assign 100% to dominant sentiment
            if (sentimentResult.sentiment === 'POSITIVE') {
              totalPositiveScore += 100;
            } else if (sentimentResult.sentiment === 'NEUTRAL') {
              totalNeutralScore += 100;
            } else if (sentimentResult.sentiment === 'NEGATIVE') {
              totalNegativeScore += 100;
            }
          }

          // Store individual result
          const analysisResult = await storage.createAnalysisResult({
            url,
            platform: contentType,
            sentiment: sentimentResult.sentiment,
            confidence: sentimentResult.confidence,
            transcript: includeTimestamps ? transcript : transcript.replace(/\[\d{2}:\d{2}\]/g, '').trim(),
            wordCount,
            sentimentScores: sentimentResult.scores ? JSON.stringify(sentimentResult.scores) : null
          });

          results.push(analysisResult);
        } catch (error) {
          console.error(`Error processing URL ${url}:`, error);
          // Continue with other URLs instead of failing the entire batch
        }
      }

      if (results.length === 0) {
        return res.status(400).json({
          error: "No videos could be processed",
          message: "All provided URLs failed to process. Please check that the URLs are valid and publicly accessible."
        });
      }

      const processingTime = (Date.now() - startTime) / 1000;
      const avgConfidence = totalConfidence / results.length;

      // Calculate average sentiment scores
      const avgPositiveScore = results.length > 0 ? Math.round(totalPositiveScore / results.length) : 0;
      const avgNeutralScore = results.length > 0 ? Math.round(totalNeutralScore / results.length) : 0;
      const avgNegativeScore = results.length > 0 ? Math.round(totalNegativeScore / results.length) : 0;
      
      console.log('Sentiment Score Debug:', {
        totalPositiveScore,
        totalNeutralScore, 
        totalNegativeScore,
        resultsLength: results.length,
        avgPositiveScore,
        avgNeutralScore,
        avgNegativeScore
      });

      // Create batch analysis record
      const batchAnalysis = await storage.createBatchAnalysis({
        contentType,
        totalVideos: results.length,
        totalWords,
        avgConfidence,
        processingTime,
        sentimentCounts: JSON.stringify(sentimentCounts)
      });

      const response: AnalyzeVideosResponse = {
        batchId: batchAnalysis.id,
        results,
        summary: {
          totalVideos: results.length,
          totalWords,
          avgConfidence: Math.round(avgConfidence),
          processingTime,
          sentimentCounts,
          sentimentScores: {
            positive: avgPositiveScore,
            neutral: avgNeutralScore,
            negative: avgNegativeScore
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error("Error in analyze endpoint:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred while processing your request. Please try again."
      });
    }
  });

  // Get batch analysis results
  app.get("/api/batch/:id", async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      if (isNaN(batchId)) {
        return res.status(400).json({ error: "Invalid batch ID" });
      }

      const batchAnalysis = await storage.getBatchAnalysis(batchId);
      if (!batchAnalysis) {
        return res.status(404).json({ error: "Batch analysis not found" });
      }

      const results = await storage.getAnalysisResultsByBatchId(batchId);
      
      res.json({
        batch: batchAnalysis,
        results
      });
    } catch (error) {
      console.error("Error fetching batch analysis:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all batch analyses for history
  app.get("/api/history", async (req, res) => {
    try {
      const batches = await storage.getAllBatchAnalyses();
      res.json(batches);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

export { registerRoutes };
