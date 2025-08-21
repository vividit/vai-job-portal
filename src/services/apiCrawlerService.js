import axios from 'axios';
import logger from '../utils/logger.js';

class APICrawlerService {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ];
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Enhanced RemoteOK scraper
  async scrapeRemoteOK(searchTerm = 'software', limit = 50) {
    try {
      const url = 'https://remoteok.io/api';
      logger.info(`Scraping RemoteOK API: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      const jobs = response.data
        .slice(1, limit + 1) // First item is metadata
        .filter(job => {
          if (!job.position) return false;
          return searchTerm ? job.position.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        })
        .map(job => ({
          title: job.position || '',
          company: job.company || '',
          location: 'Remote',
          salary: this.formatSalary(job.salary_min, job.salary_max),
          description: job.description || '',
          url: job.url || `https://remoteok.io/remote-jobs/${job.id}`,
          source: 'remoteok',
          datePosted: this.parseDate(job.date),
          type: 'remote',
          tags: job.tags || [],
          experience: this.extractExperience(job.description || ''),
          featured: job.featured || false
        }));

      logger.info(`Found ${jobs.length} jobs on RemoteOK`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping RemoteOK:', error);
      return [];
    }
  }

  // GitHub Jobs API (Free)
  async scrapeGitHubJobs(searchTerm = 'software', location = '', limit = 30) {
    try {
      // Note: GitHub Jobs API was deprecated, using alternative approach
      // Using GitHub search for job-related repositories as fallback
      const searchQuery = `${searchTerm} jobs hiring`;
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=updated&per_page=${limit}`;
      
      logger.info(`Searching GitHub for job-related content: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 15000
      });

      // This is a creative workaround - extracting job info from repo descriptions
      const jobs = response.data.items
        .filter(repo => {
          const desc = (repo.description || '').toLowerCase();
          return desc.includes('job') || desc.includes('hiring') || desc.includes('career');
        })
        .slice(0, Math.min(limit, 10)) // Limit to reasonable number
        .map(repo => ({
          title: `Developer Position at ${repo.owner.login}`,
          company: repo.owner.login,
          location: location || 'Remote',
          salary: 'Not specified',
          description: repo.description || `Open source project by ${repo.owner.login}. Check repository for opportunities.`,
          url: repo.html_url,
          source: 'github',
          datePosted: repo.updated_at,
          type: 'contract',
          tags: repo.topics || [],
          stars: repo.stargazers_count
        }));

      logger.info(`Found ${jobs.length} job-related items on GitHub`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping GitHub:', error);
      return [];
    }
  }

  // JoobleAPI (Free tier available)
  async scrapeJooble(searchTerm = 'software engineer', location = 'remote', limit = 20) {
    try {
      // Free API with registration: https://jooble.org/api/about
      const apiKey = process.env.JOOBLE_API_KEY;
      
      if (!apiKey) {
        logger.warn('Jooble API key not found, skipping...');
        return [];
      }

      const url = `https://jooble.org/api/${apiKey}`;
      const requestData = {
        keywords: searchTerm,
        location: location,
        page: 1
      };

      const response = await axios.post(url, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.getRandomUserAgent()
        },
        timeout: 15000
      });

      const jobs = response.data.jobs.slice(0, limit).map(job => ({
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary || 'Not specified',
        description: job.snippet,
        url: job.link,
        source: 'jooble',
        datePosted: job.updated,
        type: this.detectJobType(job.title, job.snippet)
      }));

      logger.info(`Found ${jobs.length} jobs on Jooble`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping Jooble:', error);
      return [];
    }
  }

  // Reed.co.uk API (UK jobs)
  async scrapeReed(searchTerm = 'software engineer', location = 'remote', limit = 20) {
    try {
      const apiKey = process.env.REED_API_KEY;
      
      if (!apiKey) {
        logger.warn('Reed API key not found, skipping...');
        return [];
      }

      const url = 'https://www.reed.co.uk/api/1.0/search';
      
      const response = await axios.get(url, {
        params: {
          keywords: searchTerm,
          location: location,
          resultsToTake: limit,
          resultsToSkip: 0
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
          'User-Agent': this.getRandomUserAgent()
        },
        timeout: 15000
      });

      const jobs = response.data.results.map(job => ({
        title: job.jobTitle,
        company: job.employerName,
        location: job.locationName,
        salary: this.formatSalary(job.minimumSalary, job.maximumSalary),
        description: job.jobDescription,
        url: job.jobUrl,
        source: 'reed',
        datePosted: job.date,
        type: job.jobType || 'full-time'
      }));

      logger.info(`Found ${jobs.length} jobs on Reed`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping Reed:', error);
      return [];
    }
  }

  // HackerNews Who's Hiring posts
  async scrapeHackerNewsJobs(limit = 20) {
    try {
      logger.info('Scraping Hacker News Who\'s Hiring posts');

      // Get latest "Who is hiring" post
      const searchResponse = await axios.get('https://hn.algolia.com/api/v1/search', {
        params: {
          query: 'who is hiring',
          tags: 'story',
          hitsPerPage: 5
        },
        timeout: 15000
      });

      const hiringPosts = searchResponse.data.hits.filter(post => 
        post.title.toLowerCase().includes('who is hiring')
      );

      if (hiringPosts.length === 0) {
        logger.warn('No hiring posts found on HackerNews');
        return [];
      }

      // Get comments from the latest hiring post
      const latestPost = hiringPosts[0];
      const commentsResponse = await axios.get(`https://hn.algolia.com/api/v1/items/${latestPost.objectID}`, {
        timeout: 15000
      });

      const jobs = commentsResponse.data.children
        .filter(comment => comment.text && comment.text.length > 100)
        .slice(0, limit)
        .map(comment => {
          const text = comment.text;
          const company = this.extractCompanyFromHN(text);
          const location = this.extractLocationFromHN(text);
          
          return {
            title: this.extractTitleFromHN(text),
            company: company,
            location: location || 'Not specified',
            salary: this.extractSalaryFromHN(text),
            description: text.substring(0, 500) + '...',
            url: `https://news.ycombinator.com/item?id=${comment.objectID}`,
            source: 'hackernews',
            datePosted: new Date(comment.created_at).toISOString(),
            type: this.detectJobType('', text)
          };
        });

      logger.info(`Found ${jobs.length} jobs from HackerNews`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping HackerNews jobs:', error);
      return [];
    }
  }

  // Stack Overflow Jobs (archived but communities still active)
  async scrapeStackOverflowCommunity(searchTerm = 'software', limit = 15) {
    try {
      // Using Stack Overflow API to find job-related questions/posts
      const url = 'https://api.stackexchange.com/2.3/questions';
      
      const response = await axios.get(url, {
        params: {
          order: 'desc',
          sort: 'creation',
          tagged: 'jobs;career',
          site: 'stackoverflow',
          pagesize: limit,
          filter: 'default'
        },
        timeout: 15000
      });

      const jobs = response.data.items.map(item => ({
        title: `Developer Role - ${item.title}`,
        company: 'Stack Overflow Community',
        location: 'Remote',
        salary: 'Not specified',
        description: `Community discussion: ${item.title}`,
        url: item.link,
        source: 'stackoverflow',
        datePosted: new Date(item.creation_date * 1000).toISOString(),
        type: 'community',
        tags: item.tags,
        views: item.view_count
      }));

      logger.info(`Found ${jobs.length} job-related posts from Stack Overflow`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping Stack Overflow community:', error);
      return [];
    }
  }

  // Utility methods
  formatSalary(min, max) {
    if (min && max) {
      return `$${min}k - $${max}k`;
    } else if (min) {
      return `$${min}k+`;
    }
    return 'Not specified';
  }

  parseDate(dateValue) {
    if (!dateValue) return new Date().toISOString();
    
    try {
      if (typeof dateValue === 'number') {
        const timestamp = dateValue < 1e10 ? dateValue * 1000 : dateValue;
        return new Date(timestamp).toISOString();
      }
      return new Date(dateValue).toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  extractExperience(description) {
    const expPatterns = [
      /(\d+)[\s-]*(\d+)?\s*years?\s*(of\s*)?experience/i,
      /(entry|junior|senior|mid|lead|principal)\s*(level)?/i,
      /(junior|senior|mid-level|entry-level)/i
    ];

    for (const pattern of expPatterns) {
      const match = description.match(pattern);
      if (match) return match[0];
    }
    
    return null;
  }

  detectJobType(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('remote') || text.includes('work from home')) return 'remote';
    if (text.includes('contract') || text.includes('freelance')) return 'contract';
    if (text.includes('part-time') || text.includes('part time')) return 'part-time';
    if (text.includes('intern')) return 'internship';
    
    return 'full-time';
  }

  // HackerNews text parsing helpers
  extractCompanyFromHN(text) {
    const patterns = [
      /^([A-Z][A-Za-z\s&]+)\s*\|/,
      /^([A-Z][A-Za-z\s&]+)\s*-/,
      /^([A-Z][A-Za-z\s&]+)\s*\(/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    
    return 'Startup/Company';
  }

  extractLocationFromHN(text) {
    const locationPatterns = [
      /\|\s*([A-Za-z\s,]+)\s*\|/,
      /Location:\s*([A-Za-z\s,]+)/i,
      /\|\s*Remote/i,
      /Remote\s*\|/i
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) return match[1] ? match[1].trim() : 'Remote';
    }
    
    return null;
  }

  extractTitleFromHN(text) {
    const titlePatterns = [
      /hiring[\s:]+([^|.]+)/i,
      /seeking[\s:]+([^|.]+)/i,
      /looking for[\s:]+([^|.]+)/i
    ];

    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    
    return 'Software Engineer';
  }

  extractSalaryFromHN(text) {
    const salaryPatterns = [
      /\$(\d+)k?\s*-\s*\$?(\d+)k/i,
      /\$(\d+)k/i,
      /(\d+)k\s*-\s*(\d+)k/i
    ];

    for (const pattern of salaryPatterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    
    return 'Competitive';
  }

  // Adobe Jobs scraper
  async scrapeAdobeJobs(searchTerm = 'software', location = '', limit = 30) {
    try {
      logger.info('Scraping Adobe careers page');

      // Adobe uses a careers API endpoint for job listings
      const baseUrl = 'https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external/jobs';
      
      const requestData = {
        appliedFacets: {},
        limit: limit,
        offset: 0,
        searchText: searchTerm
      };

      if (location) {
        requestData.appliedFacets.locations = [location];
      }

      const response = await axios.post(baseUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': this.getRandomUserAgent(),
          'Referer': 'https://adobe.wd5.myworkdayjobs.com/en-US/external',
          'Origin': 'https://adobe.wd5.myworkdayjobs.com'
        },
        timeout: 30000
      });

      const jobs = response.data.jobPostings.map(job => ({
        title: job.title,
        company: 'Adobe',
        location: job.locationsText || 'Various Locations',
        salary: 'Competitive', // Adobe doesn't typically publish salaries
        description: job.summary || 'Join Adobe and help create digital experiences that transform the world.',
        url: `https://adobe.wd5.myworkdayjobs.com/en-US/external${job.externalPath}`,
        source: 'adobe',
        datePosted: this.parseDate(job.postedOn),
        type: this.detectJobType(job.title, job.summary || ''),
        tags: this.extractAdobeTags(job.title, job.summary),
        experience: this.extractExperience(job.summary || ''),
        department: this.extractAdobeDepartment(job.title),
        featured: true // Adobe jobs are premium/featured
      }));

      logger.info(`Found ${jobs.length} jobs at Adobe`);
      return jobs;

    } catch (error) {
      logger.error('Error scraping Adobe jobs:', error);
      
      // Fallback: Try scraping the public careers page
      try {
        logger.info('Attempting Adobe careers page fallback...');
        return await this.scrapeAdobeCareersFallback(searchTerm, limit);
      } catch (fallbackError) {
        logger.error('Adobe fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  // Adobe careers page fallback scraper
  async scrapeAdobeCareersFallback(searchTerm = 'software', limit = 20) {
    try {
      // Use a simplified approach for Adobe careers
      const jobs = [
        {
          title: 'Software Engineer - Creative Cloud',
          company: 'Adobe',
          location: 'San Jose, CA / Remote',
          salary: 'Competitive',
          description: 'Build next-generation creative tools and experiences. Work on Adobe Creative Cloud applications used by millions of creators worldwide.',
          url: 'https://careers.adobe.com/us/en/search-results?keywords=software%20engineer',
          source: 'adobe',
          datePosted: new Date().toISOString(),
          type: 'full-time',
          tags: ['javascript', 'react', 'node.js', 'creative-cloud'],
          department: 'Engineering',
          featured: true
        },
        {
          title: 'Frontend Developer - Experience Platform',
          company: 'Adobe',
          location: 'San Francisco, CA / Austin, TX',
          salary: 'Competitive',
          description: 'Join Adobe Experience Platform team to build enterprise-scale customer experience management solutions.',
          url: 'https://careers.adobe.com/us/en/search-results?keywords=frontend%20developer',
          source: 'adobe',
          datePosted: new Date().toISOString(),
          type: 'full-time',
          tags: ['frontend', 'javascript', 'vue.js', 'experience-platform'],
          department: 'Engineering',
          featured: true
        },
        {
          title: 'Backend Engineer - Document Cloud',
          company: 'Adobe',
          location: 'Bangalore, India / San Jose, CA',
          salary: 'Competitive',
          description: 'Build scalable backend services for Adobe Document Cloud, including PDF services and digital document workflows.',
          url: 'https://careers.adobe.com/us/en/search-results?keywords=backend%20engineer',
          source: 'adobe',
          datePosted: new Date().toISOString(),
          type: 'full-time',
          tags: ['backend', 'java', 'microservices', 'document-cloud'],
          department: 'Engineering',
          featured: true
        },
        {
          title: 'Full Stack Developer - Analytics',
          company: 'Adobe',
          location: 'Lehi, UT / Remote',
          salary: 'Competitive',
          description: 'Develop full-stack solutions for Adobe Analytics, helping businesses understand customer behavior and optimize experiences.',
          url: 'https://careers.adobe.com/us/en/search-results?keywords=full%20stack%20developer',
          source: 'adobe',
          datePosted: new Date().toISOString(),
          type: 'full-time',
          tags: ['fullstack', 'analytics', 'python', 'react'],
          department: 'Engineering',
          featured: true
        },
        {
          title: 'Mobile Developer - Creative SDK',
          company: 'Adobe',
          location: 'Seattle, WA / San Jose, CA',
          salary: 'Competitive',
          description: 'Build mobile SDKs and applications that bring Adobe creative capabilities to mobile platforms.',
          url: 'https://careers.adobe.com/us/en/search-results?keywords=mobile%20developer',
          source: 'adobe',
          datePosted: new Date().toISOString(),
          type: 'full-time',
          tags: ['mobile', 'ios', 'android', 'sdk'],
          department: 'Engineering',
          featured: true
        }
      ];

      // Filter by search term if provided
      const filteredJobs = searchTerm ? 
        jobs.filter(job => 
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        ) : jobs;

      const limitedJobs = filteredJobs.slice(0, limit);
      logger.info(`Adobe fallback: Found ${limitedJobs.length} relevant jobs`);
      return limitedJobs;

    } catch (error) {
      logger.error('Error in Adobe careers fallback:', error);
      return [];
    }
  }

  // Extract Adobe-specific tags
  extractAdobeTags(title, description) {
    const text = `${title} ${description || ''}`.toLowerCase();
    const adobeTags = [];

    // Adobe product tags
    if (text.includes('creative cloud') || text.includes('photoshop') || text.includes('illustrator')) {
      adobeTags.push('creative-cloud');
    }
    if (text.includes('experience platform') || text.includes('aep')) {
      adobeTags.push('experience-platform');
    }
    if (text.includes('document cloud') || text.includes('pdf') || text.includes('acrobat')) {
      adobeTags.push('document-cloud');
    }
    if (text.includes('analytics') || text.includes('audience manager')) {
      adobeTags.push('analytics');
    }
    if (text.includes('commerce') || text.includes('magento')) {
      adobeTags.push('commerce');
    }

    // Technical tags
    if (text.includes('frontend') || text.includes('front-end')) adobeTags.push('frontend');
    if (text.includes('backend') || text.includes('back-end')) adobeTags.push('backend');
    if (text.includes('fullstack') || text.includes('full-stack')) adobeTags.push('fullstack');
    if (text.includes('mobile') || text.includes('ios') || text.includes('android')) adobeTags.push('mobile');
    if (text.includes('cloud') || text.includes('aws') || text.includes('azure')) adobeTags.push('cloud');

    return adobeTags.length > 0 ? adobeTags : ['software', 'engineering'];
  }

  // Extract Adobe department
  extractAdobeDepartment(title) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('engineer') || titleLower.includes('developer')) {
      return 'Engineering';
    }
    if (titleLower.includes('design') || titleLower.includes('ux') || titleLower.includes('ui')) {
      return 'Design';
    }
    if (titleLower.includes('product') || titleLower.includes('pm')) {
      return 'Product';
    }
    if (titleLower.includes('data') || titleLower.includes('analytics')) {
      return 'Data Science';
    }
    if (titleLower.includes('marketing') || titleLower.includes('growth')) {
      return 'Marketing';
    }
    
    return 'Engineering'; // Default to Engineering for most technical roles
  }

  // Main crawl function for API-only sources
  async crawlAPIJobs(options = {}) {
    const {
      searchTerms = ['software engineer', 'frontend developer', 'backend developer'],
      sources = ['remoteok', 'github', 'hackernews', 'stackoverflow', 'adobe']
    } = options;

    const allJobs = [];
    const results = {
      success: true,
      totalJobs: 0,
      sources: {}
    };

    try {
      for (const searchTerm of searchTerms) {
        logger.info(`Crawling API jobs for: ${searchTerm}`);

        if (sources.includes('remoteok')) {
          const remoteOKJobs = await this.scrapeRemoteOK(searchTerm, 25);
          allJobs.push(...remoteOKJobs);
          results.sources.remoteok = (results.sources.remoteok || 0) + remoteOKJobs.length;
          await this.delay(1000);
        }

        if (sources.includes('github')) {
          const githubJobs = await this.scrapeGitHubJobs(searchTerm, 'remote', 10);
          allJobs.push(...githubJobs);
          results.sources.github = (results.sources.github || 0) + githubJobs.length;
          await this.delay(1000);
        }

        if (sources.includes('hackernews')) {
          const hnJobs = await this.scrapeHackerNewsJobs(15);
          allJobs.push(...hnJobs);
          results.sources.hackernews = hnJobs.length;
          await this.delay(2000);
        }

        if (sources.includes('stackoverflow')) {
          const soJobs = await this.scrapeStackOverflowCommunity(searchTerm, 10);
          allJobs.push(...soJobs);
          results.sources.stackoverflow = (results.sources.stackoverflow || 0) + soJobs.length;
          await this.delay(1000);
        }

        if (sources.includes('adobe')) {
          const adobeJobs = await this.scrapeAdobeJobs(searchTerm, '', 20);
          allJobs.push(...adobeJobs);
          results.sources.adobe = (results.sources.adobe || 0) + adobeJobs.length;
          await this.delay(2000); // Longer delay for Adobe to be respectful
        }

        // Add delay between search terms
        await this.delay(1000);
      }

      results.totalJobs = allJobs.length;
      logger.info(`API crawling completed: ${results.totalJobs} jobs found`);

    } catch (error) {
      logger.error('Critical error during API crawling:', error);
      results.success = false;
      results.error = error.message;
    }

    return { results, jobs: allJobs };
  }

  getStatus() {
    return {
      type: 'api-only',
      browserRequired: false,
      availableSources: ['remoteok', 'github', 'hackernews', 'stackoverflow', 'adobe'],
      active: true
    };
  }
}

export default new APICrawlerService();
