import requests
import time
import random
import logging
from typing import Dict, List, Optional
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from fake_useragent import UserAgent
from config import Config

class JobScraper:
    def __init__(self):
        self.config = Config()
        self.logger = logging.getLogger(__name__)
        self.ua = UserAgent()
        self.driver = None
        self.session = requests.Session()
        
    def setup_driver(self):
        """Setup Chrome driver with anti-detection measures"""
        try:
            chrome_options = Options()
            
            if self.config.HEADLESS_MODE:
                chrome_options.add_argument("--headless")
            
            # Anti-detection measures
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            if self.config.USER_AGENT_ROTATION:
                chrome_options.add_argument(f"--user-agent={self.ua.random}")
            
            # Fix for WebDriver initialization
            self.driver = webdriver.Chrome(options=chrome_options)
            
            # Execute anti-detection script
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
        except Exception as e:
            self.logger.error(f"Error setting up driver: {e}")
            raise
    
    def close_driver(self):
        """Close the WebDriver"""
        if self.driver:
            try:
                self.driver.quit()
                self.driver = None
            except Exception as e:
                self.logger.error(f"Error closing driver: {e}")
    
    def scrape_naukri_jobs(self, search_query: str, location: str = "Mumbai", limit: int = 25) -> List[Dict]:
        """Scrape jobs from Naukri.com (Indian job portal)"""
        jobs = []
        try:
            # Format query for Naukri
            query = search_query.replace(" ", "-")
            url = f"https://www.naukri.com/{query}-jobs-in-{location}"
            
            if not self.driver:
                self.setup_driver()
            
            self.driver.get(url)
            time.sleep(random.uniform(3, 5))
            
            # Wait for job cards to load
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CLASS_NAME, "jobTuple"))
            )
            
            job_cards = self.driver.find_elements(By.CLASS_NAME, "jobTuple")
            
            for card in job_cards[:limit]:
                try:
                    job = self._extract_naukri_job(card)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    self.logger.warning(f"Error extracting Naukri job: {e}")
                    continue
                    
        except Exception as e:
            self.logger.error(f"Error scraping Naukri: {e}")
        
        return jobs
    
    def _extract_naukri_job(self, card) -> Optional[Dict]:
        """Extract job information from Naukri job card"""
        try:
            # Extract title
            title_elem = card.find_element(By.CSS_SELECTOR, "a.title")
            title = title_elem.text.strip()
            job_url = title_elem.get_attribute("href")
            
            # Extract company
            company_elem = card.find_element(By.CSS_SELECTOR, "a.subTitle")
            company = company_elem.text.strip()
            
            # Extract location
            location_elem = card.find_element(By.CSS_SELECTOR, "span.location")
            location = location_elem.text.strip()
            
            # Extract experience
            try:
                exp_elem = card.find_element(By.CSS_SELECTOR, "span.experience")
                experience = exp_elem.text.strip()
            except:
                experience = "Not specified"
            
            # Extract salary
            try:
                salary_elem = card.find_element(By.CSS_SELECTOR, "span.salary")
                salary = salary_elem.text.strip()
            except:
                salary = "Not specified"
            
            # Extract skills
            try:
                skills_elem = card.find_element(By.CSS_SELECTOR, "div.tags")
                skills = [skill.strip() for skill in skills_elem.text.split(",")]
            except:
                skills = []
            
            return {
                'title': title,
                'company': company,
                'location': location,
                'experience': experience,
                'salary': salary,
                'skills': skills,
                'url': job_url,
                'source': 'naukri',
                'posted_date': 'Recent'
            }
            
        except Exception as e:
            self.logger.warning(f"Error extracting Naukri job details: {e}")
            return None
    
    def scrape_indeed_jobs(self, search_query: str, location: str = "Mumbai", limit: int = 25) -> List[Dict]:
        """Scrape jobs from Indeed India"""
        jobs = []
        try:
            # Format query for Indeed India
            query = search_query.replace(" ", "+")
            location = location.replace(" ", "+")
            url = f"https://in.indeed.com/jobs?q={query}&l={location}&limit={limit}"
            
            if not self.driver:
                self.setup_driver()
            
            self.driver.get(url)
            time.sleep(random.uniform(2, 4))
            
            # Wait for job cards to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "job_seen_beacon"))
            )
            
            job_cards = self.driver.find_elements(By.CLASS_NAME, "job_seen_beacon")
            
            for card in job_cards[:limit]:
                try:
                    job = self._extract_indeed_job(card)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    self.logger.warning(f"Error extracting Indeed job: {e}")
                    continue
                    
        except Exception as e:
            self.logger.error(f"Error scraping Indeed: {e}")
        
        return jobs
    
    def _extract_indeed_job(self, card) -> Optional[Dict]:
        """Extract job information from Indeed job card"""
        try:
            # Extract title
            title_elem = card.find_element(By.CSS_SELECTOR, "h2.jobTitle a")
            title = title_elem.text.strip()
            job_url = "https://in.indeed.com" + title_elem.get_attribute("href")
            
            # Extract company
            try:
                company_elem = card.find_element(By.CSS_SELECTOR, "span.companyName")
                company = company_elem.text.strip()
            except:
                company = "Company not specified"
            
            # Extract location
            try:
                location_elem = card.find_element(By.CSS_SELECTOR, "div.companyLocation")
                location = location_elem.text.strip()
            except:
                location = "Location not specified"
            
            # Extract salary
            try:
                salary_elem = card.find_element(By.CSS_SELECTOR, "div.metadata.salary-snippet")
                salary = salary_elem.text.strip()
            except:
                salary = "Salary not specified"
            
            # Extract job type
            try:
                type_elem = card.find_element(By.CSS_SELECTOR, "div.metadata")
                job_type = type_elem.text.strip()
            except:
                job_type = "Full-time"
            
            return {
                'title': title,
                'company': company,
                'location': location,
                'salary': salary,
                'job_type': job_type,
                'url': job_url,
                'source': 'indeed_india',
                'posted_date': 'Recent'
            }
            
        except Exception as e:
            self.logger.warning(f"Error extracting Indeed job details: {e}")
            return None
    
    def scrape_linkedin_jobs(self, search_query: str, location: str = "Mumbai", limit: int = 25) -> List[Dict]:
        """Scrape jobs from LinkedIn India"""
        jobs = []
        try:
            # Format query for LinkedIn
            query = search_query.replace(" ", "%20")
            location = location.replace(" ", "%20")
            url = f"https://www.linkedin.com/jobs/search/?keywords={query}&location={location}&f_LF=f_AL&f_E=2%2C3"
            
            if not self.driver:
                self.setup_driver()
            
            self.driver.get(url)
            time.sleep(random.uniform(3, 5))
            
            # Wait for job cards to load
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CLASS_NAME, "base-card"))
            )
            
            job_cards = self.driver.find_elements(By.CLASS_NAME, "base-card")
            
            for card in job_cards[:limit]:
                try:
                    job = self._extract_linkedin_job(card)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    self.logger.warning(f"Error extracting LinkedIn job: {e}")
                    continue
                    
        except Exception as e:
            self.logger.error(f"Error scraping LinkedIn: {e}")
        
        return jobs
    
    def _extract_linkedin_job(self, card) -> Optional[Dict]:
        """Extract job information from LinkedIn job card"""
        try:
            # Extract title
            title_elem = card.find_element(By.CSS_SELECTOR, "h3.base-search-card__title")
            title = title_elem.text.strip()
            
            # Extract company
            company_elem = card.find_element(By.CSS_SELECTOR, "h4.base-search-card__subtitle")
            company = company_elem.text.strip()
            
            # Extract location
            location_elem = card.find_element(By.CSS_SELECTOR, "span.job-search-card__location")
            location = location_elem.text.strip()
            
            # Extract job URL
            try:
                url_elem = card.find_element(By.CSS_SELECTOR, "a.base-card__full-link")
                job_url = url_elem.get_attribute("href")
            except:
                job_url = "#"
            
            # Extract posted time
            try:
                time_elem = card.find_element(By.CSS_SELECTOR, "time.job-search-card__listdate")
                posted_time = time_elem.get_attribute("datetime")
            except:
                posted_time = "Recent"
            
            return {
                'title': title,
                'company': company,
                'location': location,
                'url': job_url,
                'source': 'linkedin_india',
                'posted_date': posted_time
            }
            
        except Exception as e:
            self.logger.warning(f"Error extracting LinkedIn job details: {e}")
            return None
    
    def scrape_remoteok_jobs(self, search_query: str, location: str = "Remote", limit: int = 25) -> List[Dict]:
        """Scrape jobs from RemoteOK"""
        jobs = []
        try:
            # Format query for RemoteOK
            query = search_query.replace(" ", "+")
            url = f"https://remoteok.com/remote-{query}-jobs"
            
            if not self.driver:
                self.setup_driver()
            
            self.driver.get(url)
            time.sleep(random.uniform(2, 4))
            
            # Wait for job cards to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "job"))
            )
            
            job_cards = self.driver.find_elements(By.CLASS_NAME, "job")
            
            for card in job_cards[:limit]:
                try:
                    job = self._extract_remoteok_job(card)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    self.logger.warning(f"Error extracting RemoteOK job: {e}")
                    continue
                    
        except Exception as e:
            self.logger.error(f"Error scraping RemoteOK: {e}")
        
        return jobs
    
    def _extract_remoteok_job(self, card) -> Optional[Dict]:
        """Extract job information from RemoteOK job card"""
        try:
            # Extract title
            title_elem = card.find_element(By.CSS_SELECTOR, "h2")
            title = title_elem.text.strip()
            
            # Extract company
            company_elem = card.find_element(By.CSS_SELECTOR, "h3")
            company = company_elem.text.strip()
            
            # Extract location
            try:
                location_elem = card.find_element(By.CSS_SELECTOR, ".location")
                location = location_elem.text.strip()
            except:
                location = "Remote"
            
            # Extract salary
            try:
                salary_elem = card.find_element(By.CSS_SELECTOR, ".salary")
                salary = salary_elem.text.strip()
            except:
                salary = "Not specified"
            
            # Extract job URL
            try:
                url_elem = card.find_element(By.CSS_SELECTOR, "a")
                job_url = "https://remoteok.com" + url_elem.get_attribute("href")
            except:
                job_url = "#"
            
            return {
                'title': title,
                'company': company,
                'location': location,
                'salary': salary,
                'url': job_url,
                'source': 'remoteok',
                'posted_date': 'Recent'
            }
            
        except Exception as e:
            self.logger.warning(f"Error extracting RemoteOK job details: {e}")
            return None
    
    def scrape_all_sources(self, search_query: str, location: str = "Mumbai", limit: int = 50) -> List[Dict]:
        """Scrape jobs from all available sources"""
        all_jobs = []
        
        # Scrape from Indian sources first
        try:
            naukri_jobs = self.scrape_naukri_jobs(search_query, location, limit//3)
            all_jobs.extend(naukri_jobs)
            self.logger.info(f"Scraped {len(naukri_jobs)} jobs from Naukri")
        except Exception as e:
            self.logger.error(f"Failed to scrape Naukri: {e}")
        
        try:
            indeed_jobs = self.scrape_indeed_jobs(search_query, location, limit//3)
            all_jobs.extend(indeed_jobs)
            self.logger.info(f"Scraped {len(indeed_jobs)} jobs from Indeed India")
        except Exception as e:
            self.logger.error(f"Failed to scrape Indeed India: {e}")
        
        try:
            linkedin_jobs = self.scrape_linkedin_jobs(search_query, location, limit//3)
            all_jobs.extend(linkedin_jobs)
            self.logger.info(f"Scraped {len(linkedin_jobs)} jobs from LinkedIn India")
        except Exception as e:
            self.logger.error(f"Failed to scrape LinkedIn India: {e}")
        
        # Remove duplicates
        unique_jobs = []
        seen = set()
        for job in all_jobs:
            key = f"{job['title']}_{job['company']}"
            if key not in seen:
                seen.add(key)
                unique_jobs.append(job)
        
        self.logger.info(f"Total unique jobs found: {len(unique_jobs)}")
        return unique_jobs[:limit]
    
    def __del__(self):
        """Cleanup when object is destroyed"""
        self.close_driver()
