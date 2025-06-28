import { SentimentService } from './lib/sentiment-service.js';

const sentimentService = new SentimentService();

const testTexts = [
  "This is lowkey amazing! Fire content fr fr no cap",
  "ngl this kinda slaps different vibes", 
  "whatever bruh this is sus tbh",
  "omg this is sooooo good lmao periodt",
  "not bad I guess but could be better",
  "this hits different fr best thing ever!!!",
  "meh it's okay nothing special really",
  "yooo this tutorial actually helped me so much thank you!",
  "ugh another boring video why did I watch this",
  "okay but like this is actually fire though no joke"
];

async function testSentimentAnalysis() {
  console.log('Testing enhanced OpenAI sentiment analysis...\n');
  
  for (const text of testTexts) {
    try {
      console.log(`Testing: "${text}"`);
      const result = await sentimentService.analyzeSentiment(text);
      console.log(`→ ${result.sentiment} (${result.confidence}% confidence)`);
      console.log(`→ Positive: ${result.scores?.positive}%, Neutral: ${result.scores?.neutral}%, Negative: ${result.scores?.negative}%`);
      console.log('');
    } catch (error) {
      console.error(`Error: ${error.message}`);
      console.log('');
    }
  }
}

testSentimentAnalysis().catch(console.error);