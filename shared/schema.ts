import { pgTable, text, serial, integer, boolean, real, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth with Stripe integration
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Replit user ID
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionPlan: varchar("subscription_plan"), // 'starter', 'business', 'enterprise'
  subscriptionStatus: varchar("subscription_status"), // 'active', 'canceled', 'past_due'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const batchAnalysis = pgTable("batch_analysis", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  contentType: text("content_type").notNull(),
  totalVideos: integer("total_videos").notNull(),
  totalWords: integer("total_words").notNull(),
  avgConfidence: real("avg_confidence").notNull(),
  processingTime: real("processing_time").notNull(),
  sentimentCounts: text("sentiment_counts").notNull(), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  platform: text("platform").notNull(),
  sentiment: text("sentiment").notNull(),
  confidence: real("confidence").notNull(),
  transcript: text("transcript").notNull(),
  wordCount: integer("word_count").notNull(),
  sentimentScores: text("sentiment_scores"), // JSON string containing {positive, neutral, negative}
  batchId: integer("batch_id").references(() => batchAnalysis.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const batchAnalysisRelations = relations(batchAnalysis, ({ many }) => ({
  analysisResults: many(analysisResults),
}));

export const analysisResultsRelations = relations(analysisResults, ({ one }) => ({
  batch: one(batchAnalysis, {
    fields: [analysisResults.batchId],
    references: [batchAnalysis.id],
  }),
}));

export type UpsertUser = typeof users.$inferInsert;

export const insertAnalysisResultSchema = createInsertSchema(analysisResults).omit({
  id: true,
  createdAt: true,
});

export const insertBatchAnalysisSchema = createInsertSchema(batchAnalysis).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertAnalysisResult = z.infer<typeof insertAnalysisResultSchema>;
export type BatchAnalysis = typeof batchAnalysis.$inferSelect;
export type InsertBatchAnalysis = z.infer<typeof insertBatchAnalysisSchema>;

// API request/response types
export const analyzeVideosSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(5),
  contentType: z.enum(['tiktok', 'reels', 'shorts']),
  includeTimestamps: z.boolean().optional().default(false),
});

export type AnalyzeVideosRequest = z.infer<typeof analyzeVideosSchema>;

export interface AnalyzeVideosResponse {
  batchId: number;
  results: AnalysisResult[];
  summary: {
    totalVideos: number;
    totalWords: number;
    avgConfidence: number;
    processingTime: number;
    sentimentCounts: {
      POSITIVE: number;
      NEUTRAL: number;
      NEGATIVE: number;
    };
    sentimentScores: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
}
