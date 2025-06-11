export interface SentimentResult {
  sentiment: string;
  confidence: number;
  scores?: {
    positive: number;
    negative: number;
    neutral: number;
    mixed?: number;
  };
}

export class SentimentService {
  private awsAccessKey: string;
  private awsSecretKey: string;
  private awsRegion: string;
  private anthropicApiKey: string;

  constructor() {
    this.awsAccessKey = process.env.AWS_ACCESS_KEY_ID || "";
    this.awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY || "";
    this.awsRegion = process.env.AWS_REGION || "us-east-1";
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || "";
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    // Split text into sentences for more accurate analysis
    const sentences = this.splitIntoSentences(text);
    
    try {
      // Try AWS Comprehend first
      if (this.awsAccessKey && this.awsSecretKey) {
        return await this.analyzeWithAWS(sentences);
      }
      
      // Fallback to Claude
      if (this.anthropicApiKey) {
        return await this.analyzeWithClaude(text);
      }
      
      // Fallback to local analysis
      return this.analyzeWithLocal(text);
    } catch (error) {
      console.error("Error in sentiment analysis:", error);
      // Return local analysis as final fallback
      return this.analyzeWithLocal(text);
    }
  }

  private splitIntoSentences(text: string): string[] {
    // Use Intl.Segmenter if available, otherwise fallback to regex
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
      return Array.from(segmenter.segment(text), s => s.segment.trim()).filter(s => s.length > 0);
    }
    
    // Fallback regex-based sentence splitting
    return text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private async analyzeWithAWS(sentences: string[]): Promise<SentimentResult> {
    try {
      // AWS Comprehend implementation
      const AWS = await import('@aws-sdk/client-comprehend');
      const client = new AWS.ComprehendClient({
        region: this.awsRegion,
        credentials: {
          accessKeyId: this.awsAccessKey,
          secretAccessKey: this.awsSecretKey
        }
      });

      const sentimentResults = [];
      
      for (const sentence of sentences) {
        if (sentence.length < 3) continue; // Skip very short sentences
        
        const command = new AWS.DetectSentimentCommand({
          Text: sentence,
          LanguageCode: 'en'
        });
        
        const result = await client.send(command);
        sentimentResults.push(result);
      }

      // Aggregate results
      return this.aggregateAWSSentiments(sentimentResults);
    } catch (error) {
      console.error("AWS Comprehend error:", error);
      throw error;
    }
  }

  private async analyzeWithClaude(text: string): Promise<SentimentResult> {
    try {
      const Anthropic = await import('@anthropic-ai/sdk');
      const anthropic = new Anthropic.default({
        apiKey: this.anthropicApiKey,
      });

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', // the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
        system: `You're a Customer Insights AI. Analyze this feedback and output in JSON format with keys: "sentiment" (POSITIVE/NEGATIVE/NEUTRAL), "confidence" (number, 0 through 100), and "scores" with keys "positive", "neutral", and "negative" (numbers that add up to 100).`,
        max_tokens: 1024,
        messages: [
          { role: 'user', content: text }
        ],
      });

      const textBlock = response.content.find(block => block.type === 'text');
      const content = textBlock ? (textBlock as any).text : "";
      
      try {
        const result = JSON.parse(content);
        return {
          sentiment: result.sentiment,
          confidence: Math.max(0, Math.min(100, result.confidence || 75)),
          scores: result.scores || {
            positive: result.sentiment === 'POSITIVE' ? 80 : 20,
            neutral: result.sentiment === 'NEUTRAL' ? 80 : 20,
            negative: result.sentiment === 'NEGATIVE' ? 80 : 20
          }
        };
      } catch (parseError) {
        console.error("Failed to parse Claude response:", content);
        throw parseError;
      }
    } catch (error) {
      console.error("Claude error:", error);
      throw error;
    }
  }

  private analyzeWithLocal(text: string): SentimentResult {
    // Simple lexicon-based approach for fallback
    const positiveWords = [
      'amazing', 'awesome', 'fantastic', 'great', 'excellent', 'wonderful', 'love', 'perfect',
      'incredible', 'outstanding', 'brilliant', 'superb', 'marvelous', 'terrific', 'fabulous',
      'good', 'nice', 'beautiful', 'happy', 'excited', 'thrilled', 'delighted', 'pleased'
    ];
    
    const negativeWords = [
      'terrible', 'awful', 'horrible', 'bad', 'worst', 'hate', 'disgusting', 'disappointing',
      'frustrating', 'annoying', 'boring', 'stupid', 'ridiculous', 'useless', 'pathetic',
      'sad', 'angry', 'upset', 'disappointed', 'confused', 'worried', 'concerned'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;

    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (positiveWords.includes(cleanWord)) positiveScore++;
      if (negativeWords.includes(cleanWord)) negativeScore++;
    });

    const totalSentimentWords = positiveScore + negativeScore;
    const totalWords = words.length;
    
    // Calculate percentage scores
    const positivePercentage = totalWords > 0 ? Math.round((positiveScore / totalWords) * 100) : 0;
    const negativePercentage = totalWords > 0 ? Math.round((negativeScore / totalWords) * 100) : 0;
    const neutralPercentage = Math.max(0, 100 - positivePercentage - negativePercentage);
    
    // Determine dominant sentiment
    let dominantSentiment = 'NEUTRAL';
    if (positivePercentage > negativePercentage && positivePercentage > neutralPercentage) {
      dominantSentiment = 'POSITIVE';
    } else if (negativePercentage > positivePercentage && negativePercentage > neutralPercentage) {
      dominantSentiment = 'NEGATIVE';
    }
    
    const confidence = totalSentimentWords > 0 ? Math.min(95, 60 + (totalSentimentWords * 10)) : 60;

    return {
      sentiment: dominantSentiment,
      confidence,
      scores: {
        positive: positivePercentage,
        neutral: neutralPercentage,
        negative: negativePercentage
      }
    };
  }

  private aggregateAWSSentiments(results: any[]): SentimentResult {
    if (results.length === 0) {
      return { sentiment: 'NEUTRAL', confidence: 50 };
    }

    const sentimentCounts = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0, MIXED: 0 };
    let totalConfidence = 0;
    let totalPositive = 0;
    let totalNeutral = 0;
    let totalNegative = 0;

    results.forEach(result => {
      const sentiment = result.Sentiment;
      sentimentCounts[sentiment as keyof typeof sentimentCounts]++;
      
      const scores = result.SentimentScore;
      const maxScore = Math.max(scores.Positive, scores.Negative, scores.Neutral, scores.Mixed || 0);
      totalConfidence += maxScore * 100;
      
      // Aggregate percentage scores
      totalPositive += scores.Positive * 100;
      totalNeutral += scores.Neutral * 100;
      totalNegative += scores.Negative * 100;
    });

    // Find dominant sentiment
    const dominantSentiment = Object.entries(sentimentCounts)
      .reduce((a, b) => sentimentCounts[a[0] as keyof typeof sentimentCounts] > sentimentCounts[b[0] as keyof typeof sentimentCounts] ? a : b)[0];

    const avgConfidence = Math.round(totalConfidence / results.length);
    const avgPositive = Math.round(totalPositive / results.length);
    const avgNeutral = Math.round(totalNeutral / results.length);
    const avgNegative = Math.round(totalNegative / results.length);

    return {
      sentiment: dominantSentiment,
      confidence: avgConfidence,
      scores: {
        positive: avgPositive,
        neutral: avgNeutral,
        negative: avgNegative
      }
    };
  }
}
