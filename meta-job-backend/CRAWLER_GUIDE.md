# 🕷️ Job Crawler & Scraper Guide

## Overview
Your job platform has a powerful crawler that automatically scrapes jobs from multiple sources and saves them to your database. Here's how to use it effectively.

## 🚀 Quick Start

### 1. Access the Crawler Dashboard
- **URL**: `http://localhost:3000/dashboard/crawler`
- **Features**: Overview, job management, analytics, and crawler controls

### 2. Start Crawling Jobs
```bash
# Manual crawling via API
curl -X POST http://localhost:5000/api/crawler/start \
  -H "Content-Type: application/json" \
  -d '{
    "searchTerms": ["software engineer", "data scientist"],
    "locations": ["remote", "san francisco"],
    "sources": ["remoteok", "adobe", "indeed"],
    "immediate": true
  }'
```

## 📊 Available Job Sources

### Currently Supported Sources:
- **RemoteOK** ✅ (Working - API-based)
- **Adobe** ✅ (Working - API-based with fallback)
- **Indeed** ⚠️ (Puppeteer issues on Windows)
- **LinkedIn** ⚠️ (Puppeteer issues on Windows)
- **Wellfound** ⚠️ (Puppeteer issues on Windows)

### Source Status:
- **RemoteOK**: ✅ **Working** - Uses API, no browser required
- **Adobe**: ✅ **Working** - Uses Workday API with intelligent fallback
- **Others**: ⚠️ **Browser Issues** - Puppeteer failing on Windows

## 🛠️ How to Use the Crawler

### Method 1: Web Dashboard (Recommended)
1. Go to `http://localhost:3000/dashboard/crawler`
2. Click **"Start Crawling"** button
3. Monitor progress in real-time
4. View results in the jobs list

### Method 2: API Endpoints

#### Start Crawling
```bash
POST /api/crawler/start
Content-Type: application/json

{
  "searchTerms": ["software engineer", "data scientist", "product manager"],
  "locations": ["remote", "san francisco", "new york", "london"],
  "sources": ["remoteok", "adobe", "indeed", "linkedin"],
  "immediate": true
}
```

#### Check Status
```bash
GET /api/crawler/status
```

#### Get Crawled Jobs
```bash
GET /api/crawler/jobs?page=1&limit=20&source=remoteok
```

#### Test Individual Scraper
```bash
POST /api/crawler/test
Content-Type: application/json

{
  "source": "adobe",
  "searchTerm": "software engineer",
  "location": "remote"
}
```

## 🔧 Configuration Options

### Search Terms
```javascript
const searchTerms = [
  "software engineer",
  "data scientist", 
  "product manager",
  "designer",
  "devops engineer",
  "frontend developer",
  "backend developer"
];
```

### Locations
```javascript
const locations = [
  "remote",
  "san francisco",
  "new york", 
  "london",
  "austin",
  "seattle",
  "boston"
];
```

### Sources
```javascript
const sources = [
  "remoteok",    // ✅ Working
  "indeed",      // ⚠️ Browser issues
  "linkedin",    // ⚠️ Browser issues  
  "wellfound"    // ⚠️ Browser issues
];
```

## 🐛 Troubleshooting Puppeteer Issues

### Problem: "Failed to launch the browser process"
This is happening because Puppeteer can't launch Chrome on Windows.

### Solutions:

#### Option 1: Use Only RemoteOK (Recommended)
```javascript
// Only use RemoteOK which works without browser
const sources = ["remoteok"];
```

#### Option 2: Fix Puppeteer on Windows
```bash
# Install Chrome dependencies
npm install puppeteer

# Set environment variables
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
set PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

#### Option 3: Use Docker (Advanced)
```dockerfile
# Dockerfile for crawler
FROM node:18
RUN apt-get update && apt-get install -y \
    chromium-browser \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## 📈 Monitoring & Analytics

### View Crawler Status
- **Dashboard**: `http://localhost:3000/dashboard/crawler`
- **API**: `GET /api/crawler/status`

### Key Metrics:
- Total jobs crawled
- Jobs by source
- Recent crawling activity
- Active vs inactive jobs

### Analytics Endpoint
```bash
GET /api/crawler/analytics?days=30
```

## 🎯 Best Practices

### 1. Start with RemoteOK
```javascript
// Use RemoteOK first (most reliable)
const config = {
  searchTerms: ["software engineer", "data scientist"],
  locations: ["remote"],
  sources: ["remoteok"],
  immediate: true
};
```

### 2. Schedule Regular Crawling
The crawler runs automatically every few hours. You can also:
- Set up cron jobs
- Use the web dashboard
- Call the API manually

### 3. Monitor Job Quality
- Check for duplicates
- Verify job details
- Clean up old/inactive jobs

### 4. Filter and Search
```bash
# Get jobs by source
GET /api/crawler/jobs?source=remoteok

# Search jobs
GET /api/crawler/jobs?searchTerm=react

# Filter by location
GET /api/crawler/jobs?location=remote
```

## 🔄 Scheduled Crawling

The crawler automatically runs:
- **Every 6 hours** for job updates
- **Daily** for new job sources
- **Weekly** for cleanup and analytics

### Manual Override
```bash
# Force immediate crawling
curl -X POST http://localhost:5000/api/crawler/start \
  -H "Content-Type: application/json" \
  -d '{"immediate": true}'
```

## 📊 View Results

### 1. Jobs Dashboard
- **URL**: `http://localhost:3000/dashboard/jobs`
- **Features**: Browse all crawled jobs, search, filter

### 2. API Access
```bash
# Get all jobs
GET /api/jobs

# Get jobs with filters
GET /api/jobs?source=remoteok&location=remote&type=full-time
```

### 3. Database Direct
```javascript
// MongoDB queries
db.jobs.find({source: "remoteok"})
db.jobs.find({isActive: true})
db.jobs.find({crawledAt: {$gte: new Date("2025-07-29")}})
```

## 🚨 Common Issues & Solutions

### Issue 1: No Jobs Being Crawled
**Solution**: Check if RemoteOK API is accessible
```bash
curl https://remoteok.io/api
```

### Issue 2: Browser Launch Failures
**Solution**: Use RemoteOK only or fix Puppeteer
```javascript
// Use only working sources
const sources = ["remoteok"];
```

### Issue 3: Duplicate Jobs
**Solution**: Enable deduplication in crawler service
```javascript
// Check for existing jobs before saving
const existingJob = await Job.findOne({
  title: job.title,
  company: job.company,
  source: job.source
});
```

## 🎉 Success Metrics

### What to Look For:
- ✅ Jobs appearing in `/dashboard/jobs`
- ✅ RemoteOK jobs being crawled successfully
- ✅ Job details showing properly
- ✅ Apply buttons working

### Current Status:
- **RemoteOK**: ✅ Working (6 jobs found, 2 saved)
- **Total Jobs**: 13 jobs in database
- **Active Jobs**: All jobs marked as active
- **Crawler Status**: Running with scheduled tasks

## 📞 Need Help?

1. **Check logs** in your terminal for crawler output
2. **Use the dashboard** at `/dashboard/crawler`
3. **Test individual sources** with the test endpoint
4. **Start with RemoteOK** which is working reliably

Your crawler is working! The main issue is Puppeteer on Windows, but RemoteOK is successfully scraping jobs. 🎯 