import { apiRequest } from "./queryClient";
import type { AnalyzeVideosRequest, AnalyzeVideosResponse } from "@shared/schema";

export async function analyzeVideos(request: AnalyzeVideosRequest): Promise<AnalyzeVideosResponse> {
  const response = await apiRequest("POST", "/api/analyze", request);
  return response.json();
}

export async function getBatchAnalysis(batchId: number) {
  const response = await apiRequest("GET", `/api/batch/${batchId}`);
  return response.json();
}
