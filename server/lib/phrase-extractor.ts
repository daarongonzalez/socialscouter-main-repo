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
  'worth it', 'happy', 'satisfied', 'pleased', 'excited', 'thrilled',
  // Social media specific positive terms
  'fire', 'slaps', 'hits different', 'no cap', 'bussin', 'chef\'s kiss', 'obsessed',
  'iconic', 'legendary', 'goated', 'clean', 'smooth', 'crisp', 'fresh', 'stunning',
  'gorgeous', 'flawless', 'genius', 'mindblowing', 'game changer', 'must have',
  'super excited', 'totally worth', 'highly recommend', 'absolutely love'
];

// Common negative words and phrases to look for
const NEGATIVE_INDICATORS = [
  'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'worst', 'hate',
  'annoying', 'frustrating', 'useless', 'waste', 'broken', 'cheap', 'poor',
  'fail', 'problem', 'issue', 'wrong', 'boring', 'overpriced', 'expensive',
  'not worth', 'regret', 'disappointed', 'angry', 'upset', 'confused',
  // Social media specific negative terms
  'cringe', 'yikes', 'oof', 'mid', 'trash', 'sus', 'cap', 'fake', 'basic',
  'awkward', 'messy', 'chaotic', 'disaster', 'fail', 'flop', 'rough', 'sketchy',
  'not it', 'pass', 'nope', 'hard pass', 'red flag', 'toxic', 'problematic'
];

/**
 * Extracts positive and negative phrases from a transcript
 */
export function extractPhrases(transcript: string): ExtractedPhrases {
  const text = transcript.toLowerCase();
  
  // Split by multiple delimiters including periods, exclamation, question marks, and natural pauses
  const sentences = text.split(/[.!?\n]+|(?:\s{2,})|(?:,\s+(?:and|but|so|then|now|well|okay|alright)\s+)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  const positivePhrases: string[] = [];
  const negativePhrases: string[] = [];
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    // Skip very short sentences or very long ones (likely full paragraphs)
    if (trimmedSentence.length < 8 || trimmedSentence.length > 120) continue;
    
    // Check for positive indicators
    const hasPositive = POSITIVE_INDICATORS.some(indicator => 
      trimmedSentence.includes(indicator)
    );
    
    // Check for negative indicators  
    const hasNegative = NEGATIVE_INDICATORS.some(indicator => 
      trimmedSentence.includes(indicator)
    );
    
    // Process positive phrases
    if (hasPositive && positivePhrases.length < 3) {
      const processedPhrase = extractMeaningfulPhrase(trimmedSentence, POSITIVE_INDICATORS);
      if (processedPhrase) {
        positivePhrases.push(capitalizeFirstLetter(processedPhrase));
      }
    }
    
    // Process negative phrases 
    if (hasNegative && negativePhrases.length < 3) {
      const processedPhrase = extractMeaningfulPhrase(trimmedSentence, NEGATIVE_INDICATORS);
      if (processedPhrase) {
        negativePhrases.push(capitalizeFirstLetter(processedPhrase));
      }
    }
  }
  
  return {
    positivePhrases: positivePhrases.slice(0, 2), // Limit to 2 phrases
    negativePhrases: negativePhrases.slice(0, 2)  // Limit to 2 phrases
  };
}

/**
 * Extracts a meaningful phrase around sentiment indicators
 */
function extractMeaningfulPhrase(sentence: string, indicators: string[]): string | null {
  // If sentence is already short enough, return it as-is
  if (sentence.length <= 60) {
    return sentence;
  }
  
  // Find the first sentiment indicator in the sentence
  const foundIndicator = indicators.find(indicator => sentence.includes(indicator));
  if (!foundIndicator) return sentence.substring(0, 60);
  
  const indicatorIndex = sentence.indexOf(foundIndicator);
  
  // Extract context around the indicator (roughly 30 characters before and after)
  const start = Math.max(0, indicatorIndex - 30);
  const end = Math.min(sentence.length, indicatorIndex + foundIndicator.length + 30);
  
  let extractedPhrase = sentence.substring(start, end).trim();
  
  // Clean up the edges - try to end at word boundaries
  const words = extractedPhrase.split(' ');
  if (words.length > 8) {
    // Take middle portion if too many words
    const midStart = Math.max(0, Math.floor(words.length / 4));
    const midEnd = Math.min(words.length, Math.floor(words.length * 3 / 4));
    extractedPhrase = words.slice(midStart, midEnd).join(' ');
  }
  
  // Ensure it doesn't start or end with partial words (unless it's the full sentence)
  if (start > 0 && !extractedPhrase.startsWith(' ')) {
    const firstSpace = extractedPhrase.indexOf(' ');
    if (firstSpace > 0) extractedPhrase = extractedPhrase.substring(firstSpace + 1);
  }
  
  if (end < sentence.length && !extractedPhrase.endsWith(' ')) {
    const lastSpace = extractedPhrase.lastIndexOf(' ');
    if (lastSpace > 0) extractedPhrase = extractedPhrase.substring(0, lastSpace);
  }
  
  return extractedPhrase.trim() || sentence.substring(0, 60);
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