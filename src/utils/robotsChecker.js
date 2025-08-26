import axios from 'axios';
import logger from './logger.js';

/**
 * Robots.txt checker utility
 * Fetches and parses robots.txt to determine if crawling is allowed
 */
class RobotsChecker {
  constructor() {
    this.cache = new Map(); // Cache robots.txt content
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Check if a URL is allowed to be crawled according to robots.txt
   * @param {string} url - The URL to check
   * @param {string} userAgent - User agent string (default: '*')
   * @returns {Promise<boolean>} - True if crawling is allowed
   */
  async robotsAllowed(url, userAgent = '*') {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const robotsUrl = `${baseUrl}/robots.txt`;
      const path = urlObj.pathname;

      // Check cache first
      const cacheKey = `${baseUrl}_${userAgent}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return this.isPathAllowed(path, cached.rules);
        }
      }

      // Fetch robots.txt
      const robotsContent = await this.fetchRobotsTxt(robotsUrl);
      const rules = this.parseRobotsTxt(robotsContent, userAgent);

      // Cache the rules
      this.cache.set(cacheKey, {
        rules,
        timestamp: Date.now()
      });

      return this.isPathAllowed(path, rules);

    } catch (error) {
      logger.warn(`Error checking robots.txt for ${url}:`, error.message);
      // If we can't fetch robots.txt, assume crawling is allowed
      return true;
    }
  }

  /**
   * Fetch robots.txt content
   * @param {string} robotsUrl - The robots.txt URL
   * @returns {Promise<string>} - Robots.txt content
   */
  async fetchRobotsTxt(robotsUrl) {
    try {
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'JobCrawler/1.0 (+https://yoursite.com/robots)'
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // No robots.txt found, crawling is allowed
        return '';
      }
      throw error;
    }
  }

  /**
   * Parse robots.txt content and extract rules for specific user agent
   * @param {string} content - Robots.txt content
   * @param {string} targetUserAgent - Target user agent
   * @returns {Object} - Parsed rules { disallowed: [], allowed: [], crawlDelay: number }
   */
  parseRobotsTxt(content, targetUserAgent) {
    const lines = content.split('\n').map(line => line.trim());
    const rules = {
      disallowed: [],
      allowed: [],
      crawlDelay: 0
    };

    let currentUserAgent = null;
    let isRelevantSection = false;

    for (const line of lines) {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) continue;

      const [directive, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      switch (directive.toLowerCase()) {
        case 'user-agent':
          currentUserAgent = value;
          isRelevantSection = (
            value === '*' || 
            value === targetUserAgent ||
            targetUserAgent.toLowerCase().includes(value.toLowerCase())
          );
          break;

        case 'disallow':
          if (isRelevantSection && value) {
            rules.disallowed.push(value);
          }
          break;

        case 'allow':
          if (isRelevantSection && value) {
            rules.allowed.push(value);
          }
          break;

        case 'crawl-delay':
          if (isRelevantSection && !isNaN(value)) {
            rules.crawlDelay = Math.max(rules.crawlDelay, parseInt(value));
          }
          break;
      }
    }

    return rules;
  }

  /**
   * Check if a specific path is allowed based on robots.txt rules
   * @param {string} path - The URL path to check
   * @param {Object} rules - Parsed robots.txt rules
   * @returns {boolean} - True if path is allowed
   */
  isPathAllowed(path, rules) {
    // Check explicit allow rules first (they take precedence)
    for (const allowedPath of rules.allowed) {
      if (this.pathMatches(path, allowedPath)) {
        return true;
      }
    }

    // Check disallow rules
    for (const disallowedPath of rules.disallowed) {
      if (this.pathMatches(path, disallowedPath)) {
        return false;
      }
    }

    // If no specific rules match, crawling is allowed
    return true;
  }

  /**
   * Check if a path matches a robots.txt pattern
   * @param {string} path - The actual path
   * @param {string} pattern - The robots.txt pattern
   * @returns {boolean} - True if path matches pattern
   */
  pathMatches(path, pattern) {
    // Handle wildcard patterns
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\\\*/g, '.*'); // Convert * to .*
      const regex = new RegExp(`^${regexPattern}`);
      return regex.test(path);
    }

    // Exact match or prefix match
    return path === pattern || path.startsWith(pattern);
  }

  /**
   * Get crawl delay for a domain
   * @param {string} url - The URL to check
   * @param {string} userAgent - User agent string
   * @returns {Promise<number>} - Crawl delay in seconds
   */
  async getCrawlDelay(url, userAgent = '*') {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const cacheKey = `${baseUrl}_${userAgent}`;

      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.rules.crawlDelay;
        }
      }

      // If not in cache, check robots.txt
      await this.robotsAllowed(url, userAgent);
      const cached = this.cache.get(cacheKey);
      return cached?.rules?.crawlDelay || 0;

    } catch (error) {
      logger.warn(`Error getting crawl delay for ${url}:`, error.message);
      return 1; // Default 1 second delay
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
const robotsChecker = new RobotsChecker();

// Export both the class and convenience functions
export default robotsChecker;
export const robotsAllowed = (url, userAgent) => robotsChecker.robotsAllowed(url, userAgent);
export const getCrawlDelay = (url, userAgent) => robotsChecker.getCrawlDelay(url, userAgent);
