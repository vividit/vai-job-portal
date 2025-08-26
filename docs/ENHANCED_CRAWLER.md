# Enhanced Job Crawler System

## Overview

The Enhanced Job Crawler is a comprehensive system for collecting job postings from multiple sources while respecting robots.txt policies and extracting structured data. It features intelligent data extraction, employment type analysis, and multi-currency support.

## Key Features

### 🤖 Robots.txt Compliance
- **Automatic robots.txt checking** before crawling any URL
- **Crawl delay respect** to avoid overwhelming servers
- **Cache system** for robots.txt rules to improve performance
- **User-agent specific** rules parsing

### 📊 Structured Data Extraction
- **Intelligent job parsing** from various formats
- **Employment type categorization** (Full-time, Contract, Part-time, Internship, Temporary)
- **Skills extraction** using comprehensive keyword matching
- **Salary parsing** with multi-currency support
- **Tags generation** based on job content

### 🔧 Enhanced Job Schema

```json
{
  "_id": "UUID",
  "title": "Job Title",
  "company": "Company Name",
  "location": "City, State, Country",
  "description": "Full Job Description",
  "employmentType": {
    "fullTime": 1,
    "partTime": 0,
    "contract": 0,
    "internship": 0,
    "temporary": 0,
    "other": ""
  },
  "salary": {
    "min": 120000,
    "max": 180000,
    "currency": "USD"
  },
  "skills": ["JavaScript", "React", "Node.js"],
  "tags": ["Engineering", "Remote", "Senior"],
  "withEmploymentType": "1 FTE",
  "workType": "remote",
  "currencySupported": ["USD", "INR"],
  "source": "linkedin",
  "sourceUrl": "https://...",
  "externalUrl": "https://...",
  "status": "open",
  "isActive": true,
  "crawledAt": "2025-01-19T...",
  "createdAt": "2025-01-19T...",
  "updatedAt": "2025-01-19T..."
}
```

## API Endpoints

### Enhanced Crawl
**POST** `/api/crawler/enhanced`

Start an enhanced crawling session with robots.txt compliance.

```json
{
  "urls": ["https://company.com/careers"],
  "searchTerms": ["software engineer", "developer"],
  "locations": ["remote", "san francisco"],
  "sources": ["linkedin", "indeed"],
  "maxJobsPerSource": 25,
  "respectRobots": true,
  "crawlDelay": 1000,
  "saveToDatabase": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Enhanced crawl completed: 45 jobs extracted",
  "data": {
    "sessionId": "uuid-here",
    "totalJobsExtracted": 45,
    "structuredJobs": [...],
    "saveResults": {
      "saved": 40,
      "duplicates": 3,
      "errors": 2
    },
    "robotsCompliance": true,
    "configuration": {...}
  }
}
```

### Test Robots Compliance
**POST** `/api/crawler/test-robots`

Test if a URL allows crawling according to robots.txt.

```json
{
  "url": "https://company.com/careers",
  "userAgent": "JobCrawler/1.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://company.com/careers",
    "userAgent": "JobCrawler/1.0",
    "crawlingAllowed": true,
    "crawlDelay": 2,
    "timestamp": "2025-01-19T..."
  }
}
```

## Core Components

### 1. RobotsChecker (`src/utils/robotsChecker.js`)

Handles robots.txt compliance checking:

```javascript
import { robotsAllowed, getCrawlDelay } from '../utils/robotsChecker.js';

// Check if crawling is allowed
const isAllowed = await robotsAllowed('https://example.com/jobs');

// Get recommended crawl delay
const delay = await getCrawlDelay('https://example.com');
```

**Features:**
- Fetches and parses robots.txt files
- Supports wildcard patterns and user-agent specific rules
- Caches results for 24 hours
- Handles various robots.txt formats

### 2. JobDataExtractor (`src/services/jobDataExtractor.js`)

Extracts structured data from raw job information:

```javascript
import jobDataExtractor from '../services/jobDataExtractor.js';

// Extract single job
const structuredJob = jobDataExtractor.extractJobData(rawJob, 'linkedin');

// Batch extract multiple jobs
const structuredJobs = jobDataExtractor.batchExtract(rawJobsArray, 'indeed');
```

**Capabilities:**
- **Employment Type Detection**: Automatically categorizes jobs as full-time, contract, etc.
- **Skill Extraction**: Identifies 100+ technical skills from job descriptions
- **Salary Parsing**: Handles various salary formats and currencies
- **Location Analysis**: Determines work type (remote, onsite, hybrid)
- **Tag Generation**: Creates relevant tags based on content analysis

### 3. Enhanced Crawler Service (`src/services/crawlerService.js`)

Main crawling engine with enhanced features:

```javascript
// Enhanced crawling with all features
const jobs = await crawlerService.crawlJobsEnhanced({
  urls: ['https://company.com/careers'],
  sources: ['linkedin', 'indeed'],
  respectRobots: true,
  crawlDelay: 1000
});

// Save extracted jobs to database
const saveResults = await crawlerService.saveExtractedJobs(jobs);
```

## Employment Type Analysis

The system intelligently analyzes job descriptions to categorize employment types:

### Keywords Mapping
- **Full-time**: "full time", "full-time", "permanent", "fte", "salaried"
- **Part-time**: "part time", "part-time", "hourly", "flexible"
- **Contract**: "contract", "contractor", "freelance", "consulting"
- **Internship**: "intern", "internship", "student", "graduate program"
- **Temporary**: "temp", "temporary", "seasonal", "short term"

### Output Format
```json
{
  "employmentType": {
    "fullTime": 1,
    "partTime": 0,
    "contract": 0,
    "internship": 0,
    "temporary": 0
  },
  "withEmploymentType": "1 FTE"
}
```

## Skills Extraction

### Supported Skill Categories
- **Programming Languages**: JavaScript, Python, Java, C++, etc.
- **Frameworks**: React, Angular, Vue, Django, Spring, etc.
- **Databases**: MySQL, MongoDB, PostgreSQL, Redis, etc.
- **Cloud Platforms**: AWS, Azure, GCP
- **DevOps Tools**: Docker, Kubernetes, Jenkins, etc.

### Example Output
```json
{
  "skills": [
    "JavaScript", "React", "Node.js", "Python", 
    "AWS", "Docker", "MongoDB", "Git"
  ]
}
```

## Multi-Currency Support

### Supported Currencies
- **USD** (US Dollar)
- **INR** (Indian Rupee)
- **EUR** (Euro)
- **GBP** (British Pound)
- **JPY** (Japanese Yen)

### Salary Parsing Examples
- "$120,000 - $150,000" → `{min: 120000, max: 150000, currency: "USD"}`
- "₹800,000 - ₹1,200,000" → `{min: 800000, max: 1200000, currency: "INR"}`
- "€50,000 annually" → `{min: 50000, max: 50000, currency: "EUR"}`

## Testing

Run the test suite to verify system functionality:

```bash
# Run all tests
node src/examples/testEnhancedCrawler.js

# Test individual components
node -e "
import { testRobotsChecker } from './src/examples/testEnhancedCrawler.js';
testRobotsChecker();
"
```

## Configuration

### Environment Variables
```env
# Crawler settings
CRAWLER_USER_AGENT=JobCrawler/1.0
CRAWLER_DEFAULT_DELAY=1000
CRAWLER_RESPECT_ROBOTS=true

# Database
MONGODB_URI=mongodb://localhost:27017/jobcrawler

# Robots.txt cache
ROBOTS_CACHE_TTL=86400000  # 24 hours
```

### Crawler Configuration
```json
{
  "respectRobots": true,
  "defaultCrawlDelay": 1000,
  "maxJobsPerSource": 50,
  "enableSkillsExtraction": true,
  "enableSalaryParsing": true,
  "supportedCurrencies": ["USD", "INR", "EUR", "GBP"],
  "userAgent": "JobCrawler/1.0 (+https://yoursite.com/robots)"
}
```

## Best Practices

### 1. Robots.txt Compliance
- Always check robots.txt before crawling
- Respect crawl delays specified in robots.txt
- Use appropriate user-agent strings
- Cache robots.txt results to reduce requests

### 2. Rate Limiting
- Implement delays between requests
- Use exponential backoff for retries
- Monitor server response times
- Respect HTTP status codes (429, 503)

### 3. Data Quality
- Validate extracted data before saving
- Handle missing or malformed fields gracefully
- Remove duplicates based on multiple criteria
- Log extraction errors for monitoring

### 4. Error Handling
- Implement comprehensive error logging
- Use try-catch blocks around all operations
- Provide meaningful error messages
- Continue processing when individual jobs fail

## Monitoring and Analytics

### Session Tracking
Each crawling session is tracked with:
- Unique session ID
- Configuration used
- Progress indicators
- Results summary
- Error logs

### Metrics Collected
- Jobs extracted per source
- Extraction success rate
- Duplicate detection rate
- Processing time per job
- Robots.txt compliance status

### Example Analytics Query
```javascript
// Get session analytics
const session = await CrawlerSession.findOne({ sessionId });
console.log(`Session ${sessionId}:`);
console.log(`- Jobs extracted: ${session.results.totalJobs}`);
console.log(`- Success rate: ${session.results.successRate}%`);
console.log(`- Duration: ${session.duration}ms`);
```

## Migration Guide

### From Legacy Crawler
If migrating from the legacy crawler system:

1. **Update Job Models**: The new schema includes `employmentType` object and enhanced `salary` structure
2. **Update Controllers**: Use new `enhancedCrawl` endpoint instead of basic crawling
3. **Enable Robots Compliance**: Set `respectRobots: true` in configurations
4. **Update Frontend**: Handle new data structure in UI components

### Database Migration
```javascript
// Migrate existing jobs to new schema
await Job.updateMany(
  { employmentType: { $exists: false } },
  {
    $set: {
      employmentType: {
        fullTime: 1,
        partTime: 0,
        contract: 0,
        internship: 0,
        temporary: 0
      },
      withEmploymentType: "1 FTE",
      currencySupported: ["USD", "INR"]
    }
  }
);
```

## Troubleshooting

### Common Issues

1. **Robots.txt Access Denied**
   - Check if the target site has restrictive robots.txt
   - Try different user-agent strings
   - Contact site administrators if needed

2. **Low Extraction Quality**
   - Review and update skill keywords
   - Adjust employment type detection patterns
   - Improve salary parsing regex patterns

3. **Performance Issues**
   - Increase crawl delays
   - Reduce batch sizes
   - Enable caching for repeated requests
   - Monitor memory usage

### Debug Mode
Enable detailed logging:
```env
NODE_ENV=development
LOG_LEVEL=debug
CRAWLER_DEBUG=true
```

This will provide comprehensive logs for troubleshooting extraction and crawling issues.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review test outputs for validation
3. Enable debug logging for detailed information
4. Check session logs for specific crawling issues
