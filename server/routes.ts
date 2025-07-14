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

      // Calculate average sentiment scores across all videos
      if (totalVideos > 0) {
        sentimentScores.positive = sentimentScores.positive / totalVideos;
        sentimentScores.neutral = sentimentScores.neutral / totalVideos;
        sentimentScores.negative = sentimentScores.negative / totalVideos;
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
      
      // Handle dummy batch data
      if (batchId === 999) {
        const dummyBatch = {
          id: 999,
          userId: "anonymous",
          contentType: "tiktok",
          totalVideos: 5,
          totalWords: 1250,
          avgConfidence: 85,
          processingTime: 12.5,
          sentimentCounts: JSON.stringify({
            POSITIVE: 65,
            NEUTRAL: 25,
            NEGATIVE: 10
          }),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        };
        
        const dummyResults = [
          {
            id: 9991,
            url: "https://www.tiktok.com/@foodie_life/video/7203152757287816494",
            platform: "tiktok",
            sentiment: "POSITIVE",
            confidence: 88,
            transcript: "This recipe is absolutely amazing! The flavors are incredible and so easy to make. Everyone should try this at home!",
            wordCount: 142,
            sentimentScores: JSON.stringify({
              positive: 78,
              neutral: 15,
              negative: 7
            }),
            commonPositivePhrases: ["absolutely amazing", "incredible flavors", "everyone should try"],
            commonNegativePhrases: ["too complicated", "expensive ingredients"],
            batchId: 999,
            createdAt: new Date()
          },
          {
            id: 9992,
            url: "https://www.tiktok.com/@travel_guru/video/7205660792853630214",
            platform: "tiktok",
            sentiment: "POSITIVE",
            confidence: 92,
            transcript: "Best vacation spot ever! Crystal clear waters, friendly locals, and unforgettable experiences. Highly recommend!",
            wordCount: 89,
            sentimentScores: JSON.stringify({
              positive: 85,
              neutral: 10,
              negative: 5
            }),
            commonPositivePhrases: ["best vacation spot", "highly recommend", "unforgettable experiences"],
            commonNegativePhrases: ["crowded beaches", "overpriced"],
            batchId: 999,
            createdAt: new Date()
          },
          {
            id: 9993,
            url: "https://www.tiktok.com/@tech_reviews/video/7203787386097241390",
            platform: "tiktok",
            sentiment: "NEUTRAL",
            confidence: 75,
            transcript: "This phone has decent battery life and good camera quality. The price is reasonable for what you get. Could be better though.",
            wordCount: 156,
            sentimentScores: JSON.stringify({
              positive: 45,
              neutral: 40,
              negative: 15
            }),
            commonPositivePhrases: ["decent battery life", "good camera quality", "reasonable price"],
            commonNegativePhrases: ["could be better", "not impressive", "limited features"],
            batchId: 999,
            createdAt: new Date()
          },
          {
            id: 9994,
            url: "https://www.tiktok.com/@fitness_coach/video/7341421020722613546",
            platform: "tiktok",
            sentiment: "POSITIVE",
            confidence: 83,
            transcript: "Love this workout routine! Gets your heart pumping and builds strength. Perfect for beginners and advanced users alike.",
            wordCount: 98,
            sentimentScores: JSON.stringify({
              positive: 72,
              neutral: 20,
              negative: 8
            }),
            commonPositivePhrases: ["love this workout", "perfect for beginners", "builds strength"],
            commonNegativePhrases: ["too intense", "hard to follow"],
            batchId: 999,
            createdAt: new Date()
          },
          {
            id: 9995,
            url: "https://www.tiktok.com/@music_lover/video/7298765432109876543",
            platform: "tiktok",
            sentiment: "NEGATIVE",
            confidence: 79,
            transcript: "This song is disappointing. The lyrics are confusing and the beat doesn't match the vibe. Not worth listening to.",
            wordCount: 112,
            sentimentScores: JSON.stringify({
              positive: 15,
              neutral: 25,
              negative: 60
            }),
            commonPositivePhrases: ["catchy melody", "good vocals"],
            commonNegativePhrases: ["disappointing", "confusing lyrics", "not worth listening"],
            batchId: 999,
            createdAt: new Date()
          }
        ];
        
        return res.json({ batch: dummyBatch, results: dummyResults });
      }
      
      if (batchId === 998) {
        const dummyBatch = {
          id: 998,
          userId: "anonymous",
          contentType: "reels",
          totalVideos: 3,
          totalWords: 890,
          avgConfidence: 92,
          processingTime: 8.2,
          sentimentCounts: JSON.stringify({
            POSITIVE: 75,
            NEUTRAL: 15,
            NEGATIVE: 10
          }),
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        };
        
        const dummyResults = [
          {
            id: 9981,
            url: "https://www.instagram.com/p/CpQrS9tOxYz/",
            platform: "reels",
            sentiment: "POSITIVE",
            confidence: 94,
            transcript: "Stunning sunset photography! The colors are breathtaking and the composition is perfect. This is art!",
            wordCount: 134,
            sentimentScores: JSON.stringify({
              positive: 82,
              neutral: 13,
              negative: 5
            }),
            commonPositivePhrases: ["stunning photography", "breathtaking colors", "perfect composition"],
            commonNegativePhrases: ["overexposed", "too filtered"],
            batchId: 998,
            createdAt: new Date()
          },
          {
            id: 9982,
            url: "https://www.instagram.com/p/CpRtU0vPzAb/",
            platform: "reels",
            sentiment: "POSITIVE",
            confidence: 88,
            transcript: "Amazing dance moves! The choreography is on point and the energy is infectious. Keep it up!",
            wordCount: 87,
            sentimentScores: JSON.stringify({
              positive: 76,
              neutral: 18,
              negative: 6
            }),
            commonPositivePhrases: ["amazing dance moves", "on point", "infectious energy"],
            commonNegativePhrases: ["off beat", "needs practice"],
            batchId: 998,
            createdAt: new Date()
          },
          {
            id: 9983,
            url: "https://www.instagram.com/p/CpStV1wQcDe/",
            platform: "reels",
            sentiment: "POSITIVE",
            confidence: 91,
            transcript: "Delicious looking dessert! The presentation is beautiful and I bet it tastes as good as it looks. Recipe please!",
            wordCount: 156,
            sentimentScores: JSON.stringify({
              positive: 79,
              neutral: 16,
              negative: 5
            }),
            commonPositivePhrases: ["delicious looking", "beautiful presentation", "tastes good"],
            commonNegativePhrases: ["too sweet", "complicated recipe"],
            batchId: 998,
            createdAt: new Date()
          }
        ];
        
        return res.json({ batch: dummyBatch, results: dummyResults });
      }
      
      if (batchId === 997) {
        const dummyBatch = {
          id: 997,
          userId: "anonymous",
          contentType: "shorts",
          totalVideos: 4,
          totalWords: 1120,
          avgConfidence: 78,
          processingTime: 15.7,
          sentimentCounts: JSON.stringify({
            POSITIVE: 45,
            NEUTRAL: 35,
            NEGATIVE: 20
          }),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        };
        
        const dummyResults = [
          {
            id: 9971,
            url: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
            platform: "shorts",
            sentiment: "POSITIVE",
            confidence: 82,
            transcript: "Great tutorial! Easy to follow steps and helpful tips. This will definitely help me improve my skills.",
            wordCount: 145,
            sentimentScores: JSON.stringify({
              positive: 68,
              neutral: 25,
              negative: 7
            }),
            commonPositivePhrases: ["great tutorial", "easy to follow", "helpful tips"],
            commonNegativePhrases: ["too fast", "needs more detail"],
            batchId: 997,
            createdAt: new Date()
          },
          {
            id: 9972,
            url: "https://www.youtube.com/shorts/oHg5SJYRHA0",
            platform: "shorts",
            sentiment: "NEUTRAL",
            confidence: 71,
            transcript: "This product is okay. It works as described but nothing special. Average quality for the price point.",
            wordCount: 128,
            sentimentScores: JSON.stringify({
              positive: 35,
              neutral: 50,
              negative: 15
            }),
            commonPositivePhrases: ["works as described", "average quality"],
            commonNegativePhrases: ["nothing special", "overpriced", "could be better"],
            batchId: 997,
            createdAt: new Date()
          },
          {
            id: 9973,
            url: "https://www.youtube.com/shorts/iik25wqIuFo",
            platform: "shorts",
            sentiment: "NEGATIVE",
            confidence: 85,
            transcript: "Terrible experience. Poor customer service and the product broke after one week. Would not recommend to anyone.",
            wordCount: 167,
            sentimentScores: JSON.stringify({
              positive: 8,
              neutral: 22,
              negative: 70
            }),
            commonPositivePhrases: ["quick delivery", "good packaging"],
            commonNegativePhrases: ["terrible experience", "poor customer service", "would not recommend"],
            batchId: 997,
            createdAt: new Date()
          },
          {
            id: 9974,
            url: "https://www.youtube.com/shorts/xvFZjo5PgG0",
            platform: "shorts",
            sentiment: "NEUTRAL",
            confidence: 76,
            transcript: "The movie was decent. Some good scenes but overall predictable plot. Worth watching once but not memorable.",
            wordCount: 198,
            sentimentScores: JSON.stringify({
              positive: 40,
              neutral: 45,
              negative: 15
            }),
            commonPositivePhrases: ["decent movie", "some good scenes", "worth watching"],
            commonNegativePhrases: ["predictable plot", "not memorable", "disappointing ending"],
            batchId: 997,
            createdAt: new Date()
          }
        ];
        
        return res.json({ batch: dummyBatch, results: dummyResults });
      }
      
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
      
      // Add dummy data with meaningful sentiment scores for UI testing
      const dummyBatches = [
        {
          id: 999,
          userId: "anonymous",
          contentType: "tiktok",
          totalVideos: 5,
          totalWords: 1250,
          avgConfidence: 85,
          processingTime: 12.5,
          sentimentCounts: JSON.stringify({
            POSITIVE: 65,
            NEUTRAL: 25,
            NEGATIVE: 10
          }),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          id: 998,
          userId: "anonymous",
          contentType: "reels",
          totalVideos: 3,
          totalWords: 890,
          avgConfidence: 92,
          processingTime: 8.2,
          sentimentCounts: JSON.stringify({
            POSITIVE: 75,
            NEUTRAL: 15,
            NEGATIVE: 10
          }),
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
          id: 997,
          userId: "anonymous",
          contentType: "shorts",
          totalVideos: 4,
          totalWords: 1120,
          avgConfidence: 78,
          processingTime: 15.7,
          sentimentCounts: JSON.stringify({
            POSITIVE: 45,
            NEUTRAL: 35,
            NEGATIVE: 20
          }),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        }
      ];
      
      // Combine real batches with dummy data
      const allBatches = [...dummyBatches, ...batches];
      res.json(allBatches);
    } catch (error) {
      console.error("History retrieval error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user plan information and usage (authentication bypassed)
  app.get("/api/user/plan", async (req: any, res) => {
    try {
      const planInfo = {
        planType: "business",
        planLimits: {
          maxBatchSize: 25,
          monthlyVideoLimit: 500
        },
        currentUsage: {
          monthlyVideoCount: 147,
          remainingVideos: 353,
          lastResetDate: "2024-12-01T00:00:00.000Z"
        },
        subscriptionStatus: "active"
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