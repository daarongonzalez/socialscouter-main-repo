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
  
  // Use simpler sentence splitting to ensure we get meaningful segments
  const sentences = text.split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
  
  const positivePhrases: string[] = [];
  const negativePhrases: string[] = [];
  
  console.log(`Processing transcript with ${sentences.length} sentences`);
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    // Skip very short sentences but allow longer ones (we'll truncate them later)
    if (trimmedSentence.length < 5) continue;
    
    // Check for positive indicators
    const positiveIndicator = POSITIVE_INDICATORS.find(indicator => 
      trimmedSentence.includes(indicator)
    );
    
    // Check for negative indicators  
    const negativeIndicator = NEGATIVE_INDICATORS.find(indicator => 
      trimmedSentence.includes(indicator)
    );
    
    // Process positive phrases
    if (positiveIndicator && positivePhrases.length < 2) {
      const processedPhrase = extractSentencePortion(trimmedSentence, positiveIndicator);
      if (processedPhrase) {
        positivePhrases.push(capitalizeFirstLetter(processedPhrase));
        console.log(`Added positive phrase: "${processedPhrase}"`);
      }
    }
    
    // Process negative phrases (prioritize over positive if both exist)
    else if (negativeIndicator && negativePhrases.length < 2) {
      const processedPhrase = extractSentencePortion(trimmedSentence, negativeIndicator);
      if (processedPhrase) {
        negativePhrases.push(capitalizeFirstLetter(processedPhrase));
        console.log(`Added negative phrase: "${processedPhrase}"`);
      }
    }
  }
  
  console.log(`Final extraction - Positive: ${positivePhrases.length}, Negative: ${negativePhrases.length}`);
  console.log(`Positive phrases:`, positivePhrases);
  console.log(`Negative phrases:`, negativePhrases);
  
  return {
    positivePhrases,
    negativePhrases
  };
}

/**
 * Extracts a meaningful portion of a sentence around a sentiment indicator
 */
function extractSentencePortion(sentence: string, indicator: string): string | null {
  // If sentence is short enough, return as-is
  if (sentence.length <= 80) {
    return sentence;
  }
  
  // Find where the indicator appears
  const indicatorIndex = sentence.indexOf(indicator);
  if (indicatorIndex === -1) return sentence.substring(0, 80);
  
  // Extract a window around the indicator (about 40 chars each side)
  const windowSize = 40;
  const start = Math.max(0, indicatorIndex - windowSize);
  const end = Math.min(sentence.length, indicatorIndex + indicator.length + windowSize);
  
  let portion = sentence.substring(start, end).trim();
  
  // Clean up word boundaries
  if (start > 0) {
    const firstSpace = portion.indexOf(' ');
    if (firstSpace > 0) portion = portion.substring(firstSpace + 1);
  }
  
  if (end < sentence.length) {
    const lastSpace = portion.lastIndexOf(' ');
    if (lastSpace > 0) portion = portion.substring(0, lastSpace);
  }
  
  return portion.trim() || sentence.substring(0, 80);
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