# 🔧 Crawler Error Fix

## Issue Identified
**Error**: `Failed to launch the browser process! Invalid file descriptor to ICU data received.`

## Root Cause
Puppeteer browser launch failure on Windows system. Common causes:
1. Missing Chrome/Chromium installation
2. Puppeteer version compatibility issues
3. Windows-specific ICU data loading problems

## Solutions

### Option 1: Use System Chrome (Recommended)
```bash
# Install puppeteer without bundled Chromium
npm uninstall puppeteer
npm install puppeteer-core

# Install Chrome separately
npm install chrome-aws-lambda
```

### Option 2: Fix Puppeteer Configuration
Update `src/services/crawlerService.js`:

```javascript
// Add at the top
import os from 'os';

// Update initBrowser method
async initBrowser() {
  if (!this.browser) {
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1920x1080'
      ]
    };

    // Windows-specific fixes
    if (os.platform() === 'win32') {
      launchOptions.args.push(
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-networking'
      );
    }

    this.browser = await puppeteer.launch(launchOptions);
  }
  return this.browser;
}
```

### Option 3: Use Alternative Scraping (No Browser)
For immediate fix, use API-only scraping:

```javascript
// Quick fix: Use only API-based scrapers
async crawlJobs(options = {}) {
  // Skip browser-based scrapers, use only API scrapers
  const sources = ['remoteok']; // Only use API-based sources
  
  // ... rest of the code
}
```

## Quick Fix Commands

Run these commands in order:

```powershell
# 1. Navigate to project directory
cd C:\Users\Rithika\meta-job-backend

# 2. Reinstall puppeteer with Windows compatibility
npm uninstall puppeteer
npm install puppeteer@latest --save

# 3. Alternative: Use puppeteer-core + system Chrome
npm install puppeteer-core
npm install playwright  # Alternative browser automation

# 4. Test the fix
node test-crawler.js
```

## Immediate Workaround

Create a simplified crawler that works without browser:

```javascript
// api-only-crawler.js
import axios from 'axios';

class APIOnlyCrawler {
  async scrapeJobs() {
    try {
      // Use RemoteOK API (no browser needed)
      const response = await axios.get('https://remoteok.io/api');
      const jobs = response.data.slice(1, 21); // Get first 20 jobs
      
      return jobs.map(job => ({
        title: job.position,
        company: job.company,
        location: 'Remote',
        salary: job.salary_min ? `$${job.salary_min}k+` : 'Not specified',
        source: 'remoteok',
        url: job.url,
        datePosted: new Date(job.date * 1000).toISOString()
      }));
    } catch (error) {
      console.error('API crawling error:', error);
      return [];
    }
  }
}

export default new APIOnlyCrawler();
```

## Test Again
After applying fixes, run:
```bash
node test-crawler.js
```

Should see:
```
✅ All tests passed! Crawler is working correctly.
```
