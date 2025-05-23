import { 
  users, 
  analysisResults, 
  batchAnalysis,
  type User, 
  type InsertUser,
  type AnalysisResult,
  type InsertAnalysisResult,
  type BatchAnalysis,
  type InsertBatchAnalysis
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;
  getAnalysisResultsByBatchId(batchId: number): Promise<AnalysisResult[]>;
  
  createBatchAnalysis(batch: InsertBatchAnalysis): Promise<BatchAnalysis>;
  getBatchAnalysis(id: number): Promise<BatchAnalysis | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private analysisResults: Map<number, AnalysisResult>;
  private batchAnalyses: Map<number, BatchAnalysis>;
  private currentUserId: number;
  private currentAnalysisId: number;
  private currentBatchId: number;

  constructor() {
    this.users = new Map();
    this.analysisResults = new Map();
    this.batchAnalyses = new Map();
    this.currentUserId = 1;
    this.currentAnalysisId = 1;
    this.currentBatchId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createAnalysisResult(insertResult: InsertAnalysisResult): Promise<AnalysisResult> {
    const id = this.currentAnalysisId++;
    const result: AnalysisResult = { 
      ...insertResult, 
      id,
      createdAt: new Date()
    };
    this.analysisResults.set(id, result);
    return result;
  }

  async getAnalysisResultsByBatchId(batchId: number): Promise<AnalysisResult[]> {
    // Since we're using in-memory storage, we'll store batchId in a way that allows querying
    // For simplicity, we'll return all results for now
    return Array.from(this.analysisResults.values());
  }

  async createBatchAnalysis(insertBatch: InsertBatchAnalysis): Promise<BatchAnalysis> {
    const id = this.currentBatchId++;
    const batch: BatchAnalysis = { 
      ...insertBatch, 
      id,
      createdAt: new Date()
    };
    this.batchAnalyses.set(id, batch);
    return batch;
  }

  async getBatchAnalysis(id: number): Promise<BatchAnalysis | undefined> {
    return this.batchAnalyses.get(id);
  }
}

export const storage = new MemStorage();
