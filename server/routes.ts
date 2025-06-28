import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeVideosSchema, type AnalyzeVideosRequest, type AnalyzeVideosResponse } from "@shared/schema";
import { ZodError } from "zod";
import { TranscriptService } from "./lib/transcript-service";
import { SentimentService } from "./lib/sentiment-service";
import { planLimitsService } from "./lib/plan-limits-service";
import { getSession } from "./session";
import { body, validationResult } from "express-validator";
import { InputSanitizer } from "./lib/input-sanitizer";
import { getCsrfToken } from "./lib/csrf-middleware";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});

// Helper function to extract plan from price ID
function getPlanFromPriceId(priceId: string): string | null {
  // Map actual Stripe price IDs to plan names
  const priceToPlans: { [key: string]: string } = {
    // Starter plans
    'price_1RVfTT2MTD7ADXrKJFfxbBpF': 'starter', // $29/month - Starter Tier
    'price_1RW6gp2MTD7ADXrKajpegBna': 'starter', // $279/year - Starter Tier
    
    // Business plans  
    'price_1RVfZ02MTD7ADXrK9BhHfTCb': 'business', // $49/month - Business Tier
    'price_1RW6jA2MTD7ADXrKJppgZcP1': 'business', // $470/year - Business Tier
    
    // Enterprise plans
    'price_1RW6de2MTD7ADXrKSbM0Iz6B': 'enterprise', // $129/month - Enterprise Tier
    'price_1RW6kz2MTD7ADXrKVxkkKteC': 'enterprise', // $1238/year - Enterprise Tier
  };
  
  return priceToPlans[priceId] || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware for CSRF and state management
  app.use(getSession());

  const transcriptService = new TranscriptService();
  const sentimentService = new SentimentService();

  // Auth routes (returns demo user data)
  app.get('/api/auth/user', async (req: any, res) => {
    res.json({
      id: "anonymous",
      email: "demo@socialscouter.ai",
      name: "Demo User",
      isDemo: true
    });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // CSRF token endpoint
  app.get("/api/csrf-token", (req: any, res) => {
    const token = req.csrfToken ? req.csrfToken() : getCsrfToken();
    res.json({ csrfToken: token });
  });

  // Analyze videos endpoint (authentication bypassed)
  app.post("/api/analyze", async (req: any, res) => {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationErrors.array()
        });
      }

      const startTime = Date.now();
      const requestBody = analyzeVideosSchema.parse(req.body);
      const userId = "anonymous"; // Use anonymous user for demo

      // Create batch analysis record
      const batch = await storage.createBatchAnalysis({
        userId,
        contentType: requestBody.contentType,
        totalVideos: requestBody.urls.length,
        totalWords: 0,
        avgConfidence: 0,
        processingTime: 0,
        sentimentCounts: JSON.stringify({ POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 })
      });

      // Process each URL
      const results: any[] = [];
      let totalWords = 0;
      let totalConfidence = 0;
      const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
      const sentimentScores = { positive: 0, neutral: 0, negative: 0 };

      for (const url of requestBody.urls) {
        const sanitizedUrl = InputSanitizer.sanitizeUrl(url);
        
        try {
          // Get transcript
          const transcript = await transcriptService.getTranscript(sanitizedUrl, requestBody.contentType);
          
          if (!transcript) {
            results.push({
              url: sanitizedUrl,
              platform: requestBody.contentType,
              sentiment: "NEUTRAL",
              confidence: 0.5,
              transcript: "No transcript available",
              wordCount: 0,
              sentimentScores: JSON.stringify({ positive: 0, neutral: 1, negative: 0 })
            });
            continue;
          }

          // Analyze sentiment
          const sentimentResult = await sentimentService.analyzeSentiment(transcript);
          
          // Create analysis result
          const analysisResult = await storage.createAnalysisResult({
            batchId: batch.id,
            url: sanitizedUrl,
            platform: requestBody.contentType,
            transcript: InputSanitizer.sanitizeText(transcript),
            sentiment: sentimentResult.sentiment,
            confidence: sentimentResult.confidence,
            wordCount: transcript.split(' ').length,
            sentimentScores: JSON.stringify(sentimentResult.scores || {})
          });

          results.push(analysisResult);
          totalWords += transcript.split(' ').length;
          totalConfidence += sentimentResult.confidence;
          
          // Count sentiments
          sentimentCounts[sentimentResult.sentiment as keyof typeof sentimentCounts]++;
          
          // Aggregate scores
          if (sentimentResult.scores) {
            sentimentScores.positive += sentimentResult.scores.positive;
            sentimentScores.neutral += sentimentResult.scores.neutral;
            sentimentScores.negative += sentimentResult.scores.negative;
          }
        } catch (error) {
          console.error(`Error processing URL ${sanitizedUrl}:`, error);
          results.push({
            url: sanitizedUrl,
            platform: requestBody.contentType,
            sentiment: "NEUTRAL",
            confidence: 0.5,
            transcript: "Error processing video",
            wordCount: 0,
            sentimentScores: JSON.stringify({ positive: 0, neutral: 1, negative: 0 })
          });
        }
      }

      // Calculate averages
      const totalVideos = results.length;
      const avgConfidence = totalVideos > 0 ? totalConfidence / totalVideos : 0;
      const processingTime = Date.now() - startTime;

      // Normalize sentiment scores
      const totalScore = sentimentScores.positive + sentimentScores.neutral + sentimentScores.negative;
      if (totalScore > 0) {
        sentimentScores.positive = sentimentScores.positive / totalScore;
        sentimentScores.neutral = sentimentScores.neutral / totalScore;
        sentimentScores.negative = sentimentScores.negative / totalScore;
      }

      const response: AnalyzeVideosResponse = {
        batchId: batch.id,
        results,
        summary: {
          totalVideos,
          totalWords,
          avgConfidence,
          processingTime,
          sentimentCounts,
          sentimentScores
        }
      };

      res.json(response);
    } catch (error) {
      console.error("Analysis error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors
        });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get batch analysis results (authentication bypassed)
  app.get("/api/batch/:id", async (req: any, res) => {
    try {
      const batchId = InputSanitizer.validateBatchId(req.params.id);
      const batch = await storage.getBatchAnalysis(batchId);
      
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      const results = await storage.getAnalysisResultsByBatchId(batchId);
      res.json({ batch, results });
    } catch (error) {
      console.error("Batch retrieval error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's batch analyses for history (authentication bypassed)
  app.get("/api/history", async (req: any, res) => {
    try {
      const batches = await storage.getUserBatchAnalyses("anonymous");
      res.json(batches);
    } catch (error) {
      console.error("History retrieval error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user plan information and usage (authentication bypassed)
  app.get("/api/user/plan", async (req: any, res) => {
    try {
      const planInfo = {
        planType: "demo",
        planLimits: {
          maxBatchSize: 10,
          monthlyVideoLimit: 100
        },
        currentUsage: {
          monthlyVideoCount: 0,
          remainingVideos: 100,
          lastResetDate: new Date().toISOString()
        },
        subscriptionStatus: "demo"
      };
      res.json(planInfo);
    } catch (error) {
      console.error("Plan info retrieval error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Stripe subscription routes - disabled for demo
  app.post('/api/create-subscription', async (req: any, res) => {
    res.status(401).json({ error: "Demo mode", message: "Subscription features disabled in demo mode" });
  });

  // Stripe webhook endpoint (must be before JSON body parsing middleware)
  app.post('/api/stripe/webhook', async (req, res) => {
    res.status(200).json({ received: true });
  });

  const server = createServer(app);
  return server;
}