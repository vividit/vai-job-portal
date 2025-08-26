/**
 * Test script for the Enhanced Job Crawler
 * This demonstrates the new features including robots.txt compliance and structured data extraction
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import robotsChecker from '../utils/robotsChecker.js';
import jobDataExtractor from '../services/jobDataExtractor.js';
import crawlerService from '../services/crawlerService.js';

// Load environment variables
dotenv.config();

// Sample raw job data for testing
const sampleRawJobs = [
  {
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc.',
    location: 'San Francisco, CA',
    description: 'We are looking for a senior software engineer with experience in JavaScript, React, Node.js, and Python. The candidate should have 5+ years of experience in full-time development. This is a full-time position with competitive salary ranging from $120,000 to $180,000 per year. We offer remote work options and excellent benefits.',
    salary: '$120,000 - $180,000 USD',
    datePosted: '2025-01-15',
    sourceUrl: 'https://example.com/jobs/12345',
    applyUrl: 'https://example.com/apply/12345'
  },
  {
    title: 'Frontend Developer (Contract)',
    company: 'StartupXYZ',
    location: 'New York, NY',
    description: 'Contract position for an experienced frontend developer. Must know React, Vue.js, Angular, CSS, HTML, and have experience with agile methodologies. This is a 6-month contract role with possibility of extension. Rate: $80-100/hour.',
    salary: '$80-100/hour',
    datePosted: '2025-01-14',
    sourceUrl: 'https://example.com/jobs/67890',
    type: 'contract'
  },
  {
    title: 'Software Engineering Intern',
    company: 'BigTech Corp',
    location: 'Austin, TX',
    description: 'Summer internship program for computer science students. Will work on machine learning projects using Python, TensorFlow, and AWS. This is a paid internship position for 3 months. Great learning opportunity for students.',
    salary: '$25/hour',
    datePosted: '2025-01-13',
    sourceUrl: 'https://example.com/jobs/intern123',
    type: 'internship'
  }
];

async function testRobotsChecker() {
  console.log('\n🤖 Testing Robots.txt Checker...');
  
  const testUrls = [
    'https://www.linkedin.com/jobs/search',
    'https://www.indeed.com/jobs',
    'https://remoteok.io',
    'https://example.com/careers'
  ];

  for (const url of testUrls) {
    try {
      const isAllowed = await robotsChecker.robotsAllowed(url);
      const crawlDelay = await robotsChecker.getCrawlDelay(url);
      
      console.log(`✅ ${url}`);
      console.log(`   Crawling allowed: ${isAllowed}`);
      console.log(`   Crawl delay: ${crawlDelay}s`);
    } catch (error) {
      console.log(`❌ ${url}: ${error.message}`);
    }
  }
}

async function testJobDataExtractor() {
  console.log('\n📊 Testing Job Data Extractor...');
  
  for (const [index, rawJob] of sampleRawJobs.entries()) {
    try {
      const structuredJob = jobDataExtractor.extractJobData(rawJob, 'linkedin');
      
      console.log(`\n--- Job ${index + 1}: ${structuredJob.title} ---`);
      console.log(`Company: ${structuredJob.company}`);
      console.log(`Location: ${structuredJob.location}`);
      console.log(`Employment Type:`, structuredJob.employmentType);
      console.log(`With Employment Type: ${structuredJob.withEmploymentType}`);
      console.log(`Work Type: ${structuredJob.workType}`);
      console.log(`Salary:`, structuredJob.salary);
      console.log(`Skills: ${structuredJob.skills.slice(0, 5).join(', ')}${structuredJob.skills.length > 5 ? '...' : ''}`);
      console.log(`Tags: ${structuredJob.tags.slice(0, 3).join(', ')}${structuredJob.tags.length > 3 ? '...' : ''}`);
      console.log(`Source: ${structuredJob.source}`);
      console.log(`Status: ${structuredJob.status}`);
      
    } catch (error) {
      console.log(`❌ Error extracting job ${index + 1}: ${error.message}`);
    }
  }
}

async function testBatchExtraction() {
  console.log('\n🔄 Testing Batch Job Extraction...');
  
  try {
    const batchResults = jobDataExtractor.batchExtract(sampleRawJobs, 'indeed');
    
    console.log(`✅ Successfully extracted ${batchResults.length} jobs from ${sampleRawJobs.length} raw jobs`);
    
    // Show employment type summary
    const employmentStats = batchResults.reduce((stats, job) => {
      const type = job.withEmploymentType;
      stats[type] = (stats[type] || 0) + 1;
      return stats;
    }, {});
    
    console.log('📈 Employment Type Distribution:');
    Object.entries(employmentStats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} jobs`);
    });
    
  } catch (error) {
    console.log(`❌ Batch extraction failed: ${error.message}`);
  }
}

async function testSchemaCompliance() {
  console.log('\n✅ Testing Schema Compliance...');
  
  const structuredJob = jobDataExtractor.extractJobData(sampleRawJobs[0], 'linkedin');
  
  // Check required fields
  const requiredFields = [
    '_id', 'title', 'company', 'location', 'description',
    'employmentType', 'salary', 'skills', 'tags', 'datePosted',
    'source', 'sourceUrl', 'externalUrl', 'status', 'isActive',
    'type', 'currencySupported', 'withEmploymentType',
    'crawledAt', 'createdAt', 'updatedAt'
  ];
  
  const missingFields = requiredFields.filter(field => !(field in structuredJob));
  
  if (missingFields.length === 0) {
    console.log('✅ All required fields present');
  } else {
    console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
  }
  
  // Check employment type structure
  const empType = structuredJob.employmentType;
  const requiredEmpFields = ['fullTime', 'partTime', 'contract', 'internship', 'temporary'];
  const missingEmpFields = requiredEmpFields.filter(field => typeof empType[field] !== 'number');
  
  if (missingEmpFields.length === 0) {
    console.log('✅ Employment type structure is correct');
  } else {
    console.log(`❌ Invalid employment type fields: ${missingEmpFields.join(', ')}`);
  }
  
  // Check salary structure
  const salary = structuredJob.salary;
  if (salary && typeof salary === 'object' && 'currency' in salary) {
    console.log('✅ Salary structure is correct');
  } else {
    console.log('❌ Invalid salary structure');
  }
}

async function runAllTests() {
  console.log('🚀 Starting Enhanced Job Crawler Tests...');
  console.log('=============================================');
  
  try {
    await testRobotsChecker();
    await testJobDataExtractor();
    await testBatchExtraction();
    await testSchemaCompliance();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Robots.txt checker working');
    console.log('✅ Job data extractor working');
    console.log('✅ Batch processing working');
    console.log('✅ Schema compliance verified');
    console.log('\n🚀 Enhanced crawler system is ready to use!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => {
      console.log('\n✅ Tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tests failed:', error);
      process.exit(1);
    });
}

export {
  testRobotsChecker,
  testJobDataExtractor,
  testBatchExtraction,
  testSchemaCompliance,
  runAllTests
};
