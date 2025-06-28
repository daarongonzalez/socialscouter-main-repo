// Test script to validate enhanced sentiment analysis
import { SentimentService } from './server/lib/sentiment-service.js';

const sentimentService = new SentimentService();

const testTexts = [
  "This is lowkey amazing! Fire content fr fr no cap",
  "ngl this kinda slaps different vibes",
  "whatever bruh this is sus tbh", 
  "omg this is sooooo good lmao periodt",
  "not bad I guess but could be better",
  "this hits different fr best thing ever!!!",
  "meh it's okay nothing special really"
];

async function testSentimentAnalysis() {
  console.log('Testing enhanced sentiment analysis...\n');
  
  for (const text of testTexts) {
    try {
      console.log(`Original: "${text}"`);
      const result = await sentimentService.analyzeSentiment(text);
      console.log(`Result: ${result.sentiment} (${result.confidence}% confidence)`);
      console.log(`Scores: Positive: ${result.scores.positive}%, Neutral: ${result.scores.neutral}%, Negative: ${result.scores.negative}%`);
      console.log('---');
    } catch (error) {
      console.error(`Error analyzing "${text}":`, error.message);
      console.log('---');
    }
  }
}

testSentimentAnalysis();