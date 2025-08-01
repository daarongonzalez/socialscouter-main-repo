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
  private openaiApiKey: string;

  constructor() {
    this.awsAccessKey = process.env.AWS_ACCESS_KEY_ID || "";
    this.awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY || "";
    this.awsRegion = process.env.AWS_REGION || "us-east-1";
    this.openaiApiKey = process.env.OPENAI_API_KEY || "";
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    // Preprocess text for better social media analysis
    const preprocessedText = this.preprocessSocialMediaText(text);
    
    try {
      // Try OpenAI first (primary option)
      if (this.openaiApiKey) {
        return await this.analyzeWithOpenAI(preprocessedText);
      }
      
      // Fallback to AWS Comprehend
      if (this.awsAccessKey && this.awsSecretKey) {
        const sentences = this.splitIntoSentences(preprocessedText);
        return await this.analyzeWithAWS(sentences);
      }
      
      // Final fallback to local analysis
      return this.analyzeWithLocal(preprocessedText);
    } catch (error) {
      console.error("Error in sentiment analysis:", error);
      // Try fallback methods if primary fails
      try {
        if (this.awsAccessKey && this.awsSecretKey) {
          const sentences = this.splitIntoSentences(preprocessedText);
          return await this.analyzeWithAWS(sentences);
        }
      } catch (awsError) {
        console.error("AWS fallback also failed:", awsError);
      }
      
      // Return local analysis as final fallback
      return this.analyzeWithLocal(preprocessedText);
    }
  }

  private preprocessSocialMediaText(text: string): string {
    // Convert common social media expressions and emojis to sentiment-rich text
    let processed = text;
    
    // Handle common social media abbreviations and slang
    const socialMediaMappings = {
      'lol': 'laughing out loud',
      'lmao': 'laughing very hard',
      'omg': 'oh my god',
      'wtf': 'what the hell',
      'tbh': 'to be honest',
      'ngl': 'not going to lie',
      'fr': 'for real',
      'no cap': 'no lie',
      'periodt': 'period emphasis',
      'slay': 'amazing performance',
      'fire': 'excellent',
      'lowkey': 'somewhat',
      'highkey': 'definitely',
      'sus': 'suspicious',
      'bet': 'yes definitely',
      'fam': 'friend',
      'bruh': 'disappointed expression',
      'oop': 'awkward moment',
      'stan': 'really support',
      'slaps': 'is really good',
      'hits different': 'is uniquely good',
      'vibes': 'feeling',
      'mood': 'relatable feeling'
    };
    
    // Replace abbreviations with full sentiment-bearing phrases
    for (const [abbrev, full] of Object.entries(socialMediaMappings)) {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      processed = processed.replace(regex, full);
    }
    
    // Handle repeated letters for emphasis (e.g., "sooooo good" -> "very good")
    processed = processed.replace(/(\w)\1{2,}/g, (match, letter) => {
      return `very ${letter}`;
    });
    
    // Handle multiple exclamation/question marks
    processed = processed.replace(/!{2,}/g, ' with excitement');
    processed = processed.replace(/\?{2,}/g, ' with confusion');
    
    // Clean up extra spaces
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
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

  private async analyzeWithOpenAI(text: string): Promise<SentimentResult> {
    try {
      const enhancedPrompt = `You are an expert sentiment analyst specializing in social media content from TikTok, Instagram Reels, and YouTube Shorts. 

Analyze the sentiment of this video transcript with these considerations:
- Social media language patterns (slang, abbreviations, emojis)
- Generational communication styles (Gen Z, millennial expressions)
- Context clues and implicit emotions
- Sarcasm, humor, and irony detection
- Energy levels and enthusiasm indicators
- Cultural references and trending phrases

Be sensitive to nuanced emotions that might appear neutral but contain subtle positive/negative undertones.

Examples of nuanced sentiment:
- "not bad" = mildly positive
- "could be worse" = cautiously positive
- "whatever" = mildly negative/dismissive
- "I guess" = uncertain/slightly negative
- "kinda cool" = moderately positive
- "lowkey amazing" = strongly positive but understated

Respond with ONLY a JSON object in this exact format:
{"sentiment": "POSITIVE|NEGATIVE|NEUTRAL", "confidence": 85, "scores": {"positive": 25, "neutral": 50, "negative": 25}}

Guidelines for scoring:
- Confidence: 60-95 (higher for clear sentiment, lower for ambiguous)
- Scores must add up to 100
- Avoid extreme neutral bias (like 5% positive, 90% neutral, 5% negative)
- Consider emotional intensity and context

Text to analyze: "${text}"`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: 'You are a highly skilled sentiment analysis expert specializing in social media content. You understand nuanced emotions, cultural context, and generational communication patterns.'
          }, {
            role: 'user',
            content: enhancedPrompt
          }],
          temperature: 0.2,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "";
      
      try {
        // Clean the response in case there's extra text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : content;
        const result = JSON.parse(jsonString);
        
        // Validate the response structure
        if (!result.sentiment || !result.scores) {
          throw new Error("Invalid response structure from OpenAI");
        }
        
        // Ensure scores add up to 100
        const totalScore = result.scores.positive + result.scores.neutral + result.scores.negative;
        if (Math.abs(totalScore - 100) > 1) {
          // Normalize scores if they don't add up to 100
          const factor = 100 / totalScore;
          result.scores.positive = Math.round(result.scores.positive * factor);
          result.scores.negative = Math.round(result.scores.negative * factor);
          result.scores.neutral = 100 - result.scores.positive - result.scores.negative;
        }
        
        return {
          sentiment: result.sentiment.toUpperCase(),
          confidence: Math.max(60, Math.min(95, result.confidence || 75)),
          scores: {
            positive: Math.max(0, result.scores.positive),
            neutral: Math.max(0, result.scores.neutral),
            negative: Math.max(0, result.scores.negative)
          }
        };
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", content);
        console.error("Parse error:", parseError);
        throw parseError;
      }
    } catch (error) {
      console.error("OpenAI error:", error);
      throw error;
    }
  }

  private analyzeWithLocal(text: string): SentimentResult {
    // Enhanced lexicon-based approach with social media awareness
    const sentimentLexicon = {
      // Strong positive (weight: 3)
      strongPositive: [
        'amazing', 'awesome', 'fantastic', 'incredible', 'outstanding', 'brilliant', 'perfect',
        'excellent', 'wonderful', 'superb', 'marvelous', 'terrific', 'fabulous', 'phenomenal',
        'breathtaking', 'magnificent', 'spectacular', 'extraordinary', 'exceptional', 'flawless',
        // Social media positive
        'fire', 'slay', 'slaps', 'banger', 'iconic', 'legendary', 'goat', 'chef', 'kiss'
      ],
      
      // Moderate positive (weight: 2)
      moderatePositive: [
        'good', 'nice', 'great', 'cool', 'sweet', 'solid', 'decent', 'fine', 'okay', 'alright',
        'happy', 'pleased', 'satisfied', 'glad', 'excited', 'thrilled', 'delighted', 'enjoy',
        'like', 'appreciate', 'recommend', 'impressive', 'helpful', 'useful', 'effective',
        // Social media moderate positive
        'vibes', 'mood', 'valid', 'bet', 'facts', 'real', 'true', 'based', 'w', 'dub'
      ],
      
      // Mild positive (weight: 1)
      mildPositive: [
        'kinda', 'somewhat', 'pretty', 'quite', 'fairly', 'rather', 'not bad', 'could be worse',
        'getting better', 'improving', 'progress', 'potential', 'promising', 'hopeful',
        // Social media mild positive
        'lowkey', 'ngl', 'tbh', 'fr', 'periodt', 'no cap', 'stan', 'support'
      ],
      
      // Strong negative (weight: -3)
      strongNegative: [
        'terrible', 'awful', 'horrible', 'disgusting', 'pathetic', 'worst', 'hate', 'despise',
        'atrocious', 'appalling', 'dreadful', 'abysmal', 'catastrophic', 'disastrous', 'nightmare',
        'garbage', 'trash', 'worthless', 'useless', 'hopeless', 'devastating', 'crushing',
        // Social media strong negative
        'cringe', 'yikes', 'oof', 'rip', 'dead', 'cancelled', 'toxic', 'sus'
      ],
      
      // Moderate negative (weight: -2)
      moderateNegative: [
        'bad', 'poor', 'disappointing', 'frustrating', 'annoying', 'boring', 'dull', 'stupid',
        'ridiculous', 'silly', 'pointless', 'waste', 'problem', 'issue', 'concern', 'worry',
        'sad', 'angry', 'upset', 'mad', 'confused', 'lost', 'stuck', 'failed', 'wrong',
        // Social media moderate negative
        'meh', 'nah', 'cap', 'fake', 'mid', 'basic', 'cringe', 'awkward'
      ],
      
      // Mild negative (weight: -1)
      mildNegative: [
        'whatever', 'meh', 'okay', 'fine', 'could be better', 'not great', 'not good',
        'lacking', 'missing', 'weak', 'slow', 'difficult', 'hard', 'challenge', 'struggle',
        // Social media mild negative
        'bruh', 'smh', 'facepalm', 'sigh', 'ugh', 'tired', 'done', 'over it'
      ]
    };

    const words = text.toLowerCase().split(/\s+/);
    let totalScore = 0;
    let sentimentWordCount = 0;
    
    // Analyze each word with weighted scoring
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      
      if (sentimentLexicon.strongPositive.includes(cleanWord)) {
        totalScore += 3;
        sentimentWordCount++;
      } else if (sentimentLexicon.moderatePositive.includes(cleanWord)) {
        totalScore += 2;
        sentimentWordCount++;
      } else if (sentimentLexicon.mildPositive.includes(cleanWord)) {
        totalScore += 1;
        sentimentWordCount++;
      } else if (sentimentLexicon.strongNegative.includes(cleanWord)) {
        totalScore -= 3;
        sentimentWordCount++;
      } else if (sentimentLexicon.moderateNegative.includes(cleanWord)) {
        totalScore -= 2;
        sentimentWordCount++;
      } else if (sentimentLexicon.mildNegative.includes(cleanWord)) {
        totalScore -= 1;
        sentimentWordCount++;
      }
    });

    // Check for contextual patterns
    const textLower = text.toLowerCase();
    
    // Boost for enthusiasm markers
    if (/!{2,}/.test(text)) totalScore += 1;
    if (/[A-Z]{3,}/.test(text)) totalScore += 0.5; // ALL CAPS words
    if (/very|really|so|super|extremely/.test(textLower)) totalScore += (totalScore > 0 ? 1 : -1);
    
    // Detect negation patterns
    if (/not|never|don't|doesn't|didn't|won't|can't|shouldn't/.test(textLower)) {
      totalScore *= -0.5; // Reverse and weaken sentiment
    }
    
    // Social media specific patterns
    if (/no cap|for real|periodt/.test(textLower)) totalScore += 0.5;
    if (/whatever|meh|bruh/.test(textLower)) totalScore -= 0.5;
    
    // Calculate percentages with improved distribution
    const maxPossibleScore = words.length * 3; // Theoretical maximum
    const normalizedScore = totalScore / Math.max(1, maxPossibleScore);
    
    let positivePercentage, neutralPercentage, negativePercentage;
    
    if (totalScore > 1) {
      // Strong positive sentiment
      positivePercentage = Math.min(85, 50 + (normalizedScore * 35));
      negativePercentage = Math.max(5, 15 - (normalizedScore * 10));
      neutralPercentage = 100 - positivePercentage - negativePercentage;
    } else if (totalScore < -1) {
      // Strong negative sentiment  
      negativePercentage = Math.min(85, 50 + (Math.abs(normalizedScore) * 35));
      positivePercentage = Math.max(5, 15 - (Math.abs(normalizedScore) * 10));
      neutralPercentage = 100 - positivePercentage - negativePercentage;
    } else if (totalScore > 0) {
      // Mild positive
      positivePercentage = Math.min(70, 35 + (normalizedScore * 25));
      negativePercentage = Math.max(10, 20 - (normalizedScore * 10));
      neutralPercentage = 100 - positivePercentage - negativePercentage;
    } else if (totalScore < 0) {
      // Mild negative
      negativePercentage = Math.min(70, 35 + (Math.abs(normalizedScore) * 25));
      positivePercentage = Math.max(10, 20 - (Math.abs(normalizedScore) * 10));
      neutralPercentage = 100 - positivePercentage - negativePercentage;
    } else {
      // Truly neutral
      neutralPercentage = 60;
      positivePercentage = 20;
      negativePercentage = 20;
    }
    
    // Determine dominant sentiment
    let dominantSentiment = 'NEUTRAL';
    if (positivePercentage > negativePercentage && positivePercentage > neutralPercentage) {
      dominantSentiment = 'POSITIVE';
    } else if (negativePercentage > positivePercentage && negativePercentage > neutralPercentage) {
      dominantSentiment = 'NEGATIVE';
    }
    
    // Calculate confidence based on sentiment word density and score strength
    const sentimentDensity = sentimentWordCount / Math.max(1, words.length);
    const baseConfidence = 60;
    const densityBonus = sentimentDensity * 20;
    const strengthBonus = Math.abs(totalScore) * 5;
    const confidence = Math.min(90, Math.max(60, baseConfidence + densityBonus + strengthBonus));

    return {
      sentiment: dominantSentiment,
      confidence: Math.round(confidence),
      scores: {
        positive: Math.round(positivePercentage),
        neutral: Math.round(neutralPercentage),
        negative: Math.round(negativePercentage)
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
      
      // Aggregate percentage scores (AWS returns 0-1, convert to 0-100)
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
