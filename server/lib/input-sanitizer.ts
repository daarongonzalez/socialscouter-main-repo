import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a DOMPurify instance for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    return purify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  }

  /**
   * Validate and sanitize URLs
   */
  static sanitizeUrl(url: string): string {
    try {
      // Remove any HTML encoding
      const decoded = decodeURIComponent(url);
      
      // Sanitize HTML content
      const sanitized = this.sanitizeHtml(decoded);
      
      // Validate URL format
      const urlObj = new URL(sanitized);
      
      // Only allow HTTPS URLs for security
      if (urlObj.protocol !== 'https:') {
        throw new Error('Only HTTPS URLs are allowed');
      }

      // Validate against allowed domains
      const allowedDomains = [
        'tiktok.com',
        'www.tiktok.com',
        'vm.tiktok.com',
        'instagram.com',
        'www.instagram.com',
        'youtube.com',
        'www.youtube.com',
        'youtu.be',
        'm.youtube.com'
      ];

      const hostname = urlObj.hostname.toLowerCase();
      const isAllowed = allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );

      if (!isAllowed) {
        throw new Error(`Domain not allowed: ${hostname}`);
      }

      return urlObj.toString();
    } catch (error) {
      throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sanitize general text input
   */
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove HTML tags and entities
    const sanitized = this.sanitizeHtml(input);
    
    // Remove potential script injections
    const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const cleanText = sanitized.replace(scriptPattern, '');
    
    // Limit length to prevent DoS
    if (cleanText.length > 10000) {
      throw new Error('Input too long');
    }

    return cleanText.trim();
  }

  /**
   * Validate batch ID parameter
   */
  static validateBatchId(id: string): number {
    const numId = parseInt(id, 10);
    if (isNaN(numId) || numId <= 0 || numId > Number.MAX_SAFE_INTEGER) {
      throw new Error('Invalid batch ID');
    }
    return numId;
  }
}