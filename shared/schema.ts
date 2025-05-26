import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const batchAnalysis = pgTable("batch_analysis", {
  id: serial("id").primaryKey(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAnalysisResultSchema = createInsertSchema(analysisResults).omit({
  id: true,
  createdAt: true,
});

export const insertBatchAnalysisSchema = createInsertSchema(batchAnalysis).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
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
