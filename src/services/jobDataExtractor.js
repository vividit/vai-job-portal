import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Intelligent Job Data Extractor
 * Extracts and structures job data according to the specified schema
 */
class JobDataExtractor {
  constructor() {
    // Skills keywords mapping
    this.skillsKeywords = [
      // Programming Languages
      'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript',
      'scala', 'perl', 'r', 'matlab', 'sql', 'html', 'css', 'shell', 'bash', 'haskell', 'clojure', 'erlang', 'elixir',
      
      // Frameworks & Libraries
      'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel', 'rails',
      'jquery', 'bootstrap', 'tailwind', 'next.js', 'nuxt.js', 'gatsby', 'svelte',
      
      // Databases
      'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb', 'oracle',
      'sqlite', 'firebase', 'neo4j',
      
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github', 'terraform',
      'ansible', 'chef', 'puppet', 'nginx', 'apache', 'linux', 'ubuntu', 'centos',
      
      // Tools & Technologies
      'git', 'jira', 'confluence', 'slack', 'teams', 'figma', 'adobe', 'photoshop', 'illustrator',
      'sketch', 'invision', 'zeplin', 'postman', 'swagger', 'rest', 'graphql', 'soap',
      
      // Methodologies
      'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'tdd', 'bdd', 'microservices', 'api'
    ];

    // Job categories/tags mapping
    this.jobTags = [
      'engineering', 'frontend', 'backend', 'fullstack', 'mobile', 'ios', 'android', 'web',
      'data science', 'machine learning', 'ai', 'blockchain', 'cybersecurity', 'qa', 'testing',
      'devops', 'sre', 'product', 'design', 'ui/ux', 'marketing', 'sales', 'hr', 'finance',
      'operations', 'customer success', 'support', 'management', 'leadership', 'startup',
      'enterprise', 'remote', 'hybrid', 'onsite', 'contract', 'freelance', 'internship'
    ];

    // Employment type keywords
    this.employmentKeywords = {
      fullTime: ['full time', 'full-time', 'permanent', 'fte', 'salaried'],
      partTime: ['part time', 'part-time', 'hourly', 'flexible'],
      contract: ['contract', 'contractor', 'freelance', 'consulting', 'temporary'],
      internship: ['intern', 'internship', 'student', 'graduate program'],
      temporary: ['temp', 'temporary', 'seasonal', 'short term']
    };

    // Currency mapping
    this.currencyMap = {
      '$': 'USD', '₹': 'INR', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
      'USD': 'USD', 'INR': 'INR', 'EUR': 'EUR', 'GBP': 'GBP', 'JPY': 'JPY'
    };
  }

  /**
   * Extract structured job data from raw job information
   * @param {Object} rawJobData - Raw job data from crawler
   * @param {string} source - Job source (linkedin, indeed, etc.)
   * @returns {Object} - Structured job data
   */
  extractJobData(rawJobData, source = 'other') {
    try {
      const currentTime = new Date().toISOString();
      
      // Extract basic information
      const title = this.cleanText(rawJobData.title || rawJobData.jobTitle || '');
      const company = this.cleanText(rawJobData.company || rawJobData.companyName || '');
      const location = this.cleanText(rawJobData.location || '');
      const description = this.cleanText(rawJobData.description || rawJobData.jobDescription || '');
      
      // Extract employment type information
      const employmentType = this.extractEmploymentType(description, title);
      const withEmploymentType = this.generateEmploymentSummary(employmentType);
      
      // Extract salary information
      const salary = this.extractSalary(rawJobData.salary || rawJobData.compensation || description);
      
      // Extract skills and tags
      const skills = this.extractSkills(description, title);
      const tags = this.extractTags(description, title, company);
      
      // Determine work type
      const workType = this.extractWorkType(description, location);
      
      // Parse dates
      const datePosted = this.parseDate(rawJobData.datePosted || rawJobData.postedDate) || new Date();
      
      // Generate structured job object  
      const structuredJob = {
        _id: new mongoose.Types.ObjectId(), // Use MongoDB ObjectId instead of UUID
        title,
        company,
        location,
        description,
        
        employmentType,
        
        salary: {
          min: salary.min,
          max: salary.max,
          currency: salary.currency || 'USD'
        },
        
        skills,
        tags,
        
        datePosted: datePosted.toISOString(),
        source: source.toLowerCase(),
        sourceUrl: rawJobData.sourceUrl || rawJobData.url || '',
        externalUrl: rawJobData.externalUrl || rawJobData.applyUrl || rawJobData.sourceUrl || '',
        
        status: 'open',
        isActive: true,
        applicants: [],
        maxApplications: rawJobData.maxApplications || 100,
        
        type: this.getMainEmploymentType(employmentType),
        currencySupported: ['USD', 'INR'],
        withEmploymentType,
        workType,
        
        crawledAt: currentTime,
        createdAt: currentTime,
        updatedAt: currentTime
      };

      return structuredJob;

    } catch (error) {
      logger.error('Error extracting job data:', error);
      throw new Error(`Job data extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract employment type counts from job description
   * @param {string} description - Job description
   * @param {string} title - Job title
   * @returns {Object} - Employment type counts
   */
  extractEmploymentType(description, title) {
    const text = `${description} ${title}`.toLowerCase();
    const employmentType = {
      fullTime: 0,
      partTime: 0,
      contract: 0,
      internship: 0,
      temporary: 0,
      other: ''
    };

    // Check each employment type
    for (const [type, keywords] of Object.entries(this.employmentKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          employmentType[type] = 1;
          break;
        }
      }
    }

    // Default to full-time if nothing detected
    if (Object.values(employmentType).slice(0, 5).every(val => val === 0)) {
      employmentType.fullTime = 1;
    }

    return employmentType;
  }

  /**
   * Generate human-readable employment type summary
   * @param {Object} employmentType - Employment type object
   * @returns {string} - Human-readable summary
   */
  generateEmploymentSummary(employmentType) {
    const parts = [];
    
    if (employmentType.fullTime > 0) parts.push(`${employmentType.fullTime} FTE`);
    if (employmentType.contract > 0) parts.push(`${employmentType.contract} Contract`);
    if (employmentType.partTime > 0) parts.push(`${employmentType.partTime} Part-time`);
    if (employmentType.internship > 0) parts.push(`${employmentType.internship} Internship`);
    if (employmentType.temporary > 0) parts.push(`${employmentType.temporary} Temporary`);
    
    return parts.join(', ') || '1 FTE';
  }

  /**
   * Get the main employment type for legacy compatibility
   * @param {Object} employmentType - Employment type object
   * @returns {string} - Main employment type
   */
  getMainEmploymentType(employmentType) {
    if (employmentType.fullTime > 0) return 'full-time';
    if (employmentType.contract > 0) return 'contract';
    if (employmentType.partTime > 0) return 'part-time';
    if (employmentType.internship > 0) return 'internship';
    return 'full-time';
  }

  /**
   * Extract salary information from text
   * @param {string} salaryText - Salary text or description
   * @returns {Object} - Parsed salary object
   */
  extractSalary(salaryText) {
    if (!salaryText) return { min: null, max: null, currency: 'USD' };

    const text = salaryText.toString().toLowerCase();
    
    // Extract currency
    let currency = 'USD';
    for (const [symbol, curr] of Object.entries(this.currencyMap)) {
      if (text.includes(symbol.toLowerCase())) {
        currency = curr;
        break;
      }
    }

    // Extract numbers (handle various formats)
    const numberRegex = /[\d,]+(?:\.\d+)?/g;
    const numbers = text.match(numberRegex)?.map(n => parseFloat(n.replace(/,/g, ''))) || [];

    if (numbers.length === 0) {
      return { min: null, max: null, currency };
    }

    if (numbers.length === 1) {
      return { min: numbers[0], max: numbers[0], currency };
    }

    // Multiple numbers - assume range
    const sortedNumbers = numbers.sort((a, b) => a - b);
    return {
      min: sortedNumbers[0],
      max: sortedNumbers[sortedNumbers.length - 1],
      currency
    };
  }

  /**
   * Extract skills from job description and title
   * @param {string} description - Job description
   * @param {string} title - Job title
   * @returns {Array} - Array of skills
   */
  extractSkills(description, title) {
    const text = `${description} ${title}`.toLowerCase();
    const foundSkills = [];

    for (const skill of this.skillsKeywords) {
      if (text.includes(skill.toLowerCase())) {
        foundSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
      }
    }

    // Remove duplicates and limit to most relevant
    return [...new Set(foundSkills)].slice(0, 15);
  }

  /**
   * Extract tags from job information
   * @param {string} description - Job description
   * @param {string} title - Job title
   * @param {string} company - Company name
   * @returns {Array} - Array of tags
   */
  extractTags(description, title, company) {
    const text = `${description} ${title} ${company}`.toLowerCase();
    const foundTags = [];

    for (const tag of this.jobTags) {
      if (text.includes(tag.toLowerCase())) {
        foundTags.push(tag.charAt(0).toUpperCase() + tag.slice(1));
      }
    }

    // Add employment-related tags
    if (text.includes('remote')) foundTags.push('Remote');
    if (text.includes('hybrid')) foundTags.push('Hybrid');
    if (text.includes('senior')) foundTags.push('Senior');
    if (text.includes('junior') || text.includes('entry')) foundTags.push('Entry Level');

    return [...new Set(foundTags)].slice(0, 10);
  }

  /**
   * Extract work type from description and location
   * @param {string} description - Job description
   * @param {string} location - Job location
   * @returns {string} - Work type (onsite, remote, hybrid)
   */
  extractWorkType(description, location) {
    const text = `${description} ${location}`.toLowerCase();
    
    if (text.includes('remote')) return 'remote';
    if (text.includes('hybrid')) return 'hybrid';
    if (text.includes('work from home') || text.includes('wfh')) return 'remote';
    
    return 'onsite';
  }

  /**
   * Parse date string to Date object
   * @param {string|Date} dateStr - Date string or Date object
   * @returns {Date|null} - Parsed date or null
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    try {
      // Handle various date formats
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        // Try parsing relative dates like "2 days ago"
        const now = new Date();
        if (dateStr.includes('day')) {
          const days = parseInt(dateStr.match(/\d+/)?.[0] || '0');
          return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        }
        if (dateStr.includes('hour')) {
          const hours = parseInt(dateStr.match(/\d+/)?.[0] || '0');
          return new Date(now.getTime() - (hours * 60 * 60 * 1000));
        }
        return now; // Default to current date
      }
      return parsed;
    } catch (error) {
      logger.warn('Error parsing date:', dateStr);
      return new Date();
    }
  }

  /**
   * Clean and normalize text
   * @param {string} text - Text to clean
   * @returns {string} - Cleaned text
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-.,!?()]/g, '') // Remove special characters
      .substring(0, 10000); // Limit length
  }

  /**
   * Batch extract multiple jobs
   * @param {Array} rawJobsArray - Array of raw job data
   * @param {string} source - Job source
   * @returns {Array} - Array of structured job data
   */
  batchExtract(rawJobsArray, source = 'other') {
    return rawJobsArray.map(rawJob => {
      try {
        return this.extractJobData(rawJob, source);
      } catch (error) {
        logger.error(`Error extracting job ${rawJob.title || 'unknown'}:`, error);
        return null;
      }
    }).filter(job => job !== null);
  }
}

// Export singleton instance
export default new JobDataExtractor();
