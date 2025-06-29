// Test script to verify sentiment score averaging logic
import { SentimentService } from './lib/sentiment-service.js';

const sentimentService = new SentimentService();

async function testAveraging() {
  console.log('Testing sentiment score averaging calculation...\n');
  
  // Simulate 3 videos with different sentiment levels
  const testVideos = [
    "This is absolutely amazing! Fire content, no cap!",           // Should be highly positive
    "Whatever, this is kinda boring tbh",                          // Should be negative/neutral
    "Pretty good tutorial, helped me understand the concept"       // Should be moderately positive
  ];
  
  const results = [];
  let totalPositive = 0, totalNeutral = 0, totalNegative = 0;
  
  console.log('Individual video results:');
  for (let i = 0; i < testVideos.length; i++) {
    const result = await sentimentService.analyzeSentiment(testVideos[i]);
    results.push(result);
    
    console.log(`Video ${i + 1}: "${testVideos[i]}"`);
    console.log(`  → ${result.sentiment} (${result.confidence}% confidence)`);
    console.log(`  → Scores: Positive: ${result.scores?.positive}%, Neutral: ${result.scores?.neutral}%, Negative: ${result.scores?.negative}%`);
    
    // Accumulate scores (mimicking server logic)
    totalPositive += result.scores?.positive || 0;
    totalNeutral += result.scores?.neutral || 0;
    totalNegative += result.scores?.negative || 0;
    console.log('');
  }
  
  // Calculate averages (new corrected logic)
  const videoCount = testVideos.length;
  const avgPositive = totalPositive / videoCount;
  const avgNeutral = totalNeutral / videoCount;
  const avgNegative = totalNegative / videoCount;
  
  console.log('=== BATCH SUMMARY ===');
  console.log(`Total videos analyzed: ${videoCount}`);
  console.log(`Raw totals - Positive: ${totalPositive}, Neutral: ${totalNeutral}, Negative: ${totalNegative}`);
  console.log('');
  console.log('Average Scores (what users see):');
  console.log(`  Positive: ${avgPositive.toFixed(1)}%`);
  console.log(`  Neutral: ${avgNeutral.toFixed(1)}%`);
  console.log(`  Negative: ${avgNegative.toFixed(1)}%`);
  console.log('');
  console.log('This demonstrates proper averaging: sum of individual scores ÷ number of videos');
}

testAveraging().catch(console.error);