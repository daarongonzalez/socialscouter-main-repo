export class TranscriptService {
  private apiKey: string;
  private baseUrl = "https://api.scrapecreators.com";

  constructor() {
    this.apiKey = process.env.SCRAPECREATORS_API_KEY || "";
    if (!this.apiKey) {
      console.warn("ScrapeCreators API key not found in environment variables");
    }
  }

  async getTranscript(url: string, platform: string): Promise<string | null> {
    if (!this.apiKey) {
      console.error("ScrapeCreators API key is required");
      return null;
    }

    try {
      let transcript: string | null = null;

      switch (platform) {
        case 'tiktok':
          transcript = await this.getTikTokTranscript(url);
          break;
        case 'reels':
          transcript = await this.getInstagramTranscript(url);
          break;
        case 'shorts':
          transcript = await this.getYouTubeTranscript(url);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      return transcript ? this.cleanTranscript(transcript) : null;
    } catch (error) {
      console.error(`Error fetching transcript for ${url}:`, error);
      return null;
    }
  }

  private async getTikTokTranscript(url: string): Promise<string | null> {
    try {
      const endpoint = `${this.baseUrl}/v1/tiktok/video/transcript`;
      const params = new URLSearchParams({
        url: url,
        language: 'en'
      });

      const response = await fetch(`${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`TikTok API error for ${url}:`, response.status, errorText);
        return null;
      }

      const data = await response.json();
      return data.transcript || null;
    } catch (error) {
      console.error(`TikTok transcript error for ${url}:`, error);
      return null;
    }
  }

  private async getInstagramTranscript(url: string): Promise<string | null> {
    try {
      const endpoint = `${this.baseUrl}/v2/instagram/media/transcript`;
      const params = new URLSearchParams({ url: url });

      const response = await fetch(`${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Instagram API error for ${url}:`, response.status, errorText);
        return null;
      }

      const data = await response.json();
      
      if (!data.success || !data.transcripts || data.transcripts.length === 0) {
        console.warn(`No Instagram transcript found for ${url}`);
        return null;
      }

      // Combine all transcript texts (for carousel posts)
      const combinedText = data.transcripts
        .map((item: any) => item.text)
        .filter((text: string) => text && text.trim())
        .join(' ');

      return combinedText || null;
    } catch (error) {
      console.error(`Instagram transcript error for ${url}:`, error);
      return null;
    }
  }

  private async getYouTubeTranscript(url: string): Promise<string | null> {
    try {
      const endpoint = `${this.baseUrl}/v1/youtube/video/transcript`;
      const params = new URLSearchParams({ url: url });

      const response = await fetch(`${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`YouTube API error for ${url}:`, response.status, errorText);
        return null;
      }

      const data = await response.json();
      
      // Use transcript_only_text if available, otherwise combine transcript array
      if (data.transcript_only_text) {
        return data.transcript_only_text;
      }

      if (data.transcript && Array.isArray(data.transcript)) {
        const combinedText = data.transcript
          .map((item: any) => item.text)
          .filter((text: string) => text && text.trim())
          .join(' ');
        return combinedText || null;
      }

      console.warn(`No YouTube transcript found for ${url}`);
      return null;
    } catch (error) {
      console.error(`YouTube transcript error for ${url}:`, error);
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
