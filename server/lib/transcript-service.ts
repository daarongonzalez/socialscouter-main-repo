import { apiRequest } from "../../client/src/lib/queryClient";

export class TranscriptService {
  private apiKey: string;
  private baseUrl = "https://api.scrapecreators.com";

  constructor() {
    this.apiKey = process.env.SCRAPECREATORS_API_KEY || process.env.SCRAPE_CREATORS_API_KEY || "";
    if (!this.apiKey) {
      console.warn("ScrapeCreators API key not found in environment variables");
    }
  }

  async getTranscript(url: string, platform: string): Promise<string | null> {
    try {
      // Map platform to ScrapeCreators endpoints
      const platformEndpoints = {
        'tiktok': '/tiktok/video',
        'reels': '/instagram/reel',
        'shorts': '/youtube/shorts'
      };

      const endpoint = platformEndpoints[platform as keyof typeof platformEndpoints];
      if (!endpoint) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ScrapeCreators API error for ${url}:`, response.status, errorText);
        
        // If API fails, return a fallback transcript for development
        if (process.env.NODE_ENV === 'development') {
          return this.getFallbackTranscript(platform);
        }
        
        return null;
      }

      const data = await response.json();
      
      // Extract transcript from response based on ScrapeCreators API structure
      const transcript = data.transcript || data.captions || data.text || "";
      
      if (!transcript) {
        console.warn(`No transcript found for URL: ${url}`);
        
        // Return fallback for development
        if (process.env.NODE_ENV === 'development') {
          return this.getFallbackTranscript(platform);
        }
        
        return null;
      }

      return this.cleanTranscript(transcript);
    } catch (error) {
      console.error(`Error fetching transcript for ${url}:`, error);
      
      // Return fallback for development
      if (process.env.NODE_ENV === 'development') {
        return this.getFallbackTranscript(platform);
      }
      
      return null;
    }
  }

  private getFallbackTranscript(platform: string): string {
    const fallbackTranscripts = {
      'tiktok': "Hey everyone! Just tried this amazing new recipe and I'm absolutely obsessed! The flavors are incredible and it's so easy to make. You definitely need to try this at home. Link in bio for the full recipe! #cooking #recipe #foodie #delicious",
      'reels': "Good morning beautiful souls! Starting my day with some positive affirmations and gratitude. Remember, you are enough exactly as you are. Sending love and light to everyone watching this. Have an amazing day! ✨ #positivity #mindfulness #selfcare #motivation",
      'shorts': "This productivity hack literally changed my life! I used to struggle with time management but this simple technique helped me get so much more done. Try it for a week and let me know how it goes in the comments below! #productivity #lifehacks #timemanagement #success"
    };

    return fallbackTranscripts[platform as keyof typeof fallbackTranscripts] || fallbackTranscripts.tiktok;
  }

  private cleanTranscript(transcript: string): string {
    // Remove common transcript artifacts
    let cleaned = transcript
      .replace(/\[music\]/gi, '')
      .replace(/\[applause\]/gi, '')
      .replace(/\[laughter\]/gi, '')
      .replace(/\[inaudible\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }
}
