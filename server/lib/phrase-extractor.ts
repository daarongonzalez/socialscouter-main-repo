/**
 * Phrase extraction utility for sentiment analysis
 * Extracts meaningful positive and negative phrases from transcripts
 */

interface ExtractedPhrases {
  positivePhrases: string[];
  negativePhrases: string[];
}

// Common positive words and phrases to look for
const POSITIVE_INDICATORS = [
  'love', 'amazing', 'awesome', 'great', 'excellent', 'fantastic', 'wonderful', 
  'perfect', 'beautiful', 'incredible', 'impressive', 'outstanding', 'brilliant',
  'good', 'nice', 'cool', 'sweet', 'solid', 'quality', 'recommend', 'best',
  'worth it', 'happy', 'satisfied', 'pleased', 'excited', 'thrilled'
];

// Common negative words and phrases to look for
const NEGATIVE_INDICATORS = [
  'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'worst', 'hate',
  'annoying', 'frustrating', 'useless', 'waste', 'broken', 'cheap', 'poor',
  'fail', 'problem', 'issue', 'wrong', 'boring', 'overpriced', 'expensive',
  'not worth', 'regret', 'disappointed', 'angry', 'upset', 'confused'
];

/**
 * Extracts positive and negative phrases from a transcript
 */
export function extractPhrases(transcript: string): ExtractedPhrases {
  const text = transcript.toLowerCase();
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const positivePhrases: string[] = [];
  const negativePhrases: string[] = [];
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (trimmedSentence.length < 10) continue; // Skip very short sentences
    
    // Check for positive indicators
    const hasPositive = POSITIVE_INDICATORS.some(indicator => 
      trimmedSentence.includes(indicator)
    );
    
    // Check for negative indicators
    const hasNegative = NEGATIVE_INDICATORS.some(indicator => 
      trimmedSentence.includes(indicator)
    );
    
    // Add to appropriate array (limit to reasonable length)
    if (hasPositive && positivePhrases.length < 3) {
      positivePhrases.push(capitalizeFirstLetter(trimmedSentence));
    } else if (hasNegative && negativePhrases.length < 3) {
      negativePhrases.push(capitalizeFirstLetter(trimmedSentence));
    }
  }
  
  return {
    positivePhrases: positivePhrases.slice(0, 2), // Limit to 2 phrases
    negativePhrases: negativePhrases.slice(0, 2)  // Limit to 2 phrases
  };
}

/**
 * Capitalizes the first letter of a sentence
 */
function capitalizeFirstLetter(sentence: string): string {
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/**
 * Gets a single best positive phrase from the extracted phrases
 */
export function getBestPositivePhrase(phrases: string[]): string | null {
  return phrases.length > 0 ? phrases[0] : null;
}

/**
 * Gets a single best negative phrase from the extracted phrases
 */
export function getBestNegativePhrase(phrases: string[]): string | null {
  return phrases.length > 0 ? phrases[0] : null;
}