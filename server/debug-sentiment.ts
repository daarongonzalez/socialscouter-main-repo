// Debug script to check sentiment analysis return values
import { SentimentService } from './lib/sentiment-service.js';

const sentimentService = new SentimentService();

async function debugSentiment() {
  console.log('Testing sentiment analysis return values...\n');
  
  const testText = "This is absolutely amazing! Fire content, no cap!";
  
  try {
    const result = await sentimentService.analyzeSentiment(testText);
    
    console.log('=== SENTIMENT ANALYSIS RESULT ===');
    console.log('Text:', testText);
    console.log('Sentiment:', result.sentiment);
    console.log('Confidence:', result.confidence);
    console.log('Raw scores object:', result.scores);
    console.log('Positive score:', result.scores?.positive, '(type:', typeof result.scores?.positive, ')');
    console.log('Neutral score:', result.scores?.neutral, '(type:', typeof result.scores?.neutral, ')');
    console.log('Negative score:', result.scores?.negative, '(type:', typeof result.scores?.negative, ')');
    
    // Test what happens when we sum these values
    if (result.scores) {
      const sum = result.scores.positive + result.scores.neutral + result.scores.negative;
      console.log('Sum of scores:', sum);
      console.log('Expected scale: 100 (percentages) or 1.0 (decimals)');
      
      if (sum > 10) {
        console.log('✓ Scores are in percentage format (0-100)');
      } else if (sum <= 1.1) {
        console.log('⚠ Scores are in decimal format (0-1) - this is the problem!');
      } else {
        console.log('❌ Unexpected score scale');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugSentiment().catch(console.error);