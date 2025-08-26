# 🔧 Crawler Troubleshooting Guide

## Common Issues & Solutions

### 1. **PowerShell Command Issues**

**Problem**: `The token '&&' is not a valid statement separator`

**Solution**: Use PowerShell-specific syntax:
```powershell
# Instead of: cd vivid-frontend && npm run dev
# Use:
cd vivid-frontend
npm run dev

# Or use semicolon:
cd vivid-frontend; npm run dev
```

### 2. **Browser Launch Errors**

**Error**: `Error launching browser` or `Failed to launch the browser process`

**Solutions**:
```javascript
// Update puppeteer config in crawlerService.js
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920x1080',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
});
```

**Windows-specific fixes**:
```bash
# Install Chrome dependencies
npm install puppeteer-core
npm install chrome-aws-lambda

# Or use system Chrome
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install puppeteer
```

### 3. **Network/Timeout Errors**

**Error**: `Navigation timeout of 30000 ms exceeded`

**Solutions**:
```javascript
// Increase timeout
await page.goto(url, { 
  waitUntil: 'networkidle0', 
  timeout: 60000 // Increase to 60 seconds
});

// Add retry logic
const retry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
};
```

### 4. **Rate Limiting Issues**

**Error**: `429 Too Many Requests` or blocked responses

**Solutions**:
```javascript
// Add random delays
const randomDelay = () => Math.floor(Math.random() * 3000) + 2000;
await new Promise(resolve => setTimeout(resolve, randomDelay()));

// Rotate user agents
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
];

// Use proxy rotation (optional)
const proxies = ['proxy1:port', 'proxy2:port'];
```

### 5. **Selector/DOM Changes**

**Error**: `Element not found` or empty results

**Solutions**:
```javascript
// Wait for elements to load
await page.waitForSelector('[data-testid="job-title"]', { timeout: 10000 });

// Use multiple fallback selectors
const titleSelectors = [
  '[data-testid="job-title"] a',
  '.jobTitle a',
  'h2 a[data-jk]',
  '.jobTitle-color-purple'
];

let titleElement = null;
for (const selector of titleSelectors) {
  titleElement = element.querySelector(selector);
  if (titleElement) break;
}
```

### 6. **Database Connection Errors**

**Error**: `MongoServerError` or connection timeouts

**Solutions**:
```javascript
// Check MongoDB connection
import mongoose from 'mongoose';

const checkConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
  }
};

// Add connection retry logic
const connectWithRetry = () => {
  return mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    retryReads: true
  }).catch(err => {
    console.error('MongoDB connection failed, retrying in 5 seconds...', err);
    setTimeout(connectWithRetry, 5000);
  });
};
```

### 7. **Memory Issues**

**Error**: `JavaScript heap out of memory`

**Solutions**:
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 server.js

# Or set environment variable
export NODE_OPTIONS="--max-old-space-size=4096"
```

```javascript
// Close pages after use
try {
  // crawling logic
} finally {
  if (page) await page.close();
  if (browser) await browser.close();
}

// Clear memory periodically
if (this.crawledJobs.size > 10000) {
  this.crawledJobs.clear();
}
```

### 8. **CAPTCHA/Bot Detection**

**Error**: `Access denied` or CAPTCHA challenges

**Solutions**:
```javascript
// Add stealth plugin
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Randomize behavior
const humanDelay = (min = 500, max = 2000) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Simulate human scrolling
await page.evaluate(() => {
  return new Promise((resolve) => {
    let totalHeight = 0;
    const distance = 100;
    const timer = setInterval(() => {
      const scrollHeight = document.body.scrollHeight;
      window.scrollBy(0, distance);
      totalHeight += distance;
      if(totalHeight >= scrollHeight){
        clearInterval(timer);
        resolve();
      }
    }, 100);
  });
});
```

## 🔍 Debugging Steps

### 1. **Check Service Status**
```javascript
// In crawler controller
app.get('/api/crawler/debug', (req, res) => {
  const status = crawlerService.getStatus();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    crawlerStatus: status,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`
    },
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform
  });
});
```

### 2. **Enable Detailed Logging**
```javascript
// Add to logger configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug', // Change from 'info' to 'debug'
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### 3. **Test Individual Components**
```javascript
// Test database connection
app.get('/api/test/db', async (req, res) => {
  try {
    const jobCount = await Job.countDocuments();
    res.json({ success: true, jobCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test browser launch
app.get('/api/test/browser', async (req, res) => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    await browser.close();
    res.json({ success: true, message: 'Browser launched successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 🚀 Performance Optimization

### 1. **Parallel Processing**
```javascript
// Process multiple sources concurrently
const crawlPromises = [];

if (sources.includes('indeed')) {
  crawlPromises.push(this.scrapeIndeed(searchTerm, location));
}
if (sources.includes('linkedin')) {
  crawlPromises.push(this.scrapeLinkedIn(searchTerm, location));
}

const results = await Promise.allSettled(crawlPromises);
```

### 2. **Batch Database Operations**
```javascript
// Use bulk operations instead of individual saves
const bulkOps = processedJobs.map(job => ({
  updateOne: {
    filter: { 
      title: job.title, 
      company: job.company, 
      source: job.source 
    },
    update: { $set: job },
    upsert: true
  }
}));

const result = await Job.bulkWrite(bulkOps);
```

### 3. **Caching Strategy**
```javascript
// Cache successful results
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour

const getCachedJobs = (key) => {
  return cache.get(key);
};

const setCachedJobs = (key, jobs) => {
  cache.set(key, jobs);
};
```

## 📊 Monitoring Dashboard

Create monitoring endpoints:

```javascript
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    crawler: crawlerService.getStatus()
  });
});

// Metrics endpoint
app.get('/api/metrics', async (req, res) => {
  const jobCount = await Job.countDocuments();
  const recentJobs = await Job.countDocuments({
    crawledAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });
  
  res.json({
    totalJobs: jobCount,
    jobsLast24h: recentJobs,
    memory: process.memoryUsage(),
    crawler: crawlerService.getStatus()
  });
});
```

## 🛡️ Error Recovery

```javascript
// Automatic restart on errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log error and restart
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log error but don't exit
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await crawlerService.closeBrowser();
  process.exit(0);
});
```

## 📞 Quick Fix Commands

```bash
# Restart services
npm run dev
pm2 restart all

# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check logs
tail -f combined.log
pm2 logs

# Memory cleanup
node --expose-gc server.js
# Then in code: if (global.gc) global.gc();

# Database reset (careful!)
mongo your-db-name --eval "db.jobs.deleteMany({})"
```

---

**Need more help?** Check the logs in `combined.log` and `error.log` for detailed error information.
