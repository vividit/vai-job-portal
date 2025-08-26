# 🌐 Browser Scraping Solutions

## Current Status
✅ **API-based scraping working** (RemoteOK)  
❌ **Browser-based scraping failing** (Indeed, LinkedIn, Wellfound)

## Solution Options

### Option 1: Fix Browser Issues (Recommended)

#### A. Install Chrome Properly
```powershell
# Method 1: Download Chrome manually
# Go to: https://www.google.com/chrome/
# Download and install Chrome

# Method 2: Use Chocolatey (if installed)
choco install googlechrome

# Method 3: Use winget (Windows Package Manager)
winget install Google.Chrome
```

#### B. Fix Puppeteer Installation
```powershell
# Reinstall puppeteer with latest version
npm uninstall puppeteer
npm cache clean --force
npm install puppeteer@latest

# Alternative: Use system Chrome
npm install puppeteer-core
# Then set PUPPETEER_EXECUTABLE_PATH environment variable
```

#### C. Use Playwright (Better Windows Support)
```powershell
npm install playwright
npx playwright install chromium
```

### Option 2: Expand API-Only Scraping (Quick Fix)

Add more API-based job sources that don't need browsers:

```javascript
// Add to crawlerService.js

// GitHub Jobs API
async scrapeGitHubJobs(searchTerm = 'software', limit = 30) {
  try {
    const url = `https://jobs.github.com/positions.json?search=${encodeURIComponent(searchTerm)}`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': this.getRandomUserAgent() },
      timeout: 10000
    });

    return response.data.slice(0, limit).map(job => ({
      title: job.title,
      company: job.company,
      location: job.location || 'Remote',
      type: job.type,
      description: job.description,
      url: job.url,
      source: 'github',
      datePosted: job.created_at
    }));
  } catch (error) {
    logger.error('Error scraping GitHub Jobs:', error);
    return [];
  }
}

// Adzuna Jobs API
async scrapeAdzuna(searchTerm = 'software engineer', location = 'remote', limit = 20) {
  try {
    const appId = process.env.ADZUNA_APP_ID; // Get free API key
    const appKey = process.env.ADZUNA_APP_KEY;
    
    if (!appId || !appKey) {
      logger.warn('Adzuna API credentials not found');
      return [];
    }

    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=${limit}&what=${encodeURIComponent(searchTerm)}&where=${encodeURIComponent(location)}`;
    
    const response = await axios.get(url);
    
    return response.data.results.map(job => ({
      title: job.title,
      company: job.company.display_name,
      location: job.location.display_name,
      salary: job.salary_min ? `$${job.salary_min} - $${job.salary_max}` : 'Not specified',
      description: job.description,
      url: job.redirect_url,
      source: 'adzuna',
      datePosted: job.created
    }));
  } catch (error) {
    logger.error('Error scraping Adzuna:', error);
    return [];
  }
}

// JSearch API (RapidAPI)
async scrapeJSearch(searchTerm = 'software engineer', location = 'remote', limit = 20) {
  try {
    const rapidApiKey = process.env.RAPIDAPI_KEY; // Get from RapidAPI
    
    if (!rapidApiKey) {
      logger.warn('RapidAPI key not found for JSearch');
      return [];
    }

    const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
      params: {
        query: `${searchTerm} in ${location}`,
        page: '1',
        num_pages: '1',
        date_posted: 'all'
      },
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    });

    return response.data.data.slice(0, limit).map(job => ({
      title: job.job_title,
      company: job.employer_name,
      location: job.job_city ? `${job.job_city}, ${job.job_state}` : location,
      salary: job.job_salary || 'Not specified',
      description: job.job_description,
      url: job.job_apply_link,
      source: 'jsearch',
      datePosted: job.job_posted_at_datetime_utc
    }));
  } catch (error) {
    logger.error('Error scraping JSearch:', error);
    return [];
  }
}
```

### Option 3: Use Alternative Scraping Methods

#### Selenium WebDriver (More Reliable)
```powershell
npm install selenium-webdriver
npm install chromedriver
```

```javascript
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

async initSelenium() {
  const options = new chrome.Options();
  options.addArguments('--headless');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  
  return await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
}
```

#### Cheerio + Axios (No Browser)
```javascript
// Simple HTML parsing without browser
async scrapeWithCheerio(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    // Parse HTML with cheerio selectors
    
    return jobs;
  } catch (error) {
    logger.error('Cheerio scraping error:', error);
    return [];
  }
}
```

## Immediate Fix Implementation

Let me create an enhanced API-only crawler:
