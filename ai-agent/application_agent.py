import time
import random
import logging
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from fake_useragent import UserAgent

from config import Config
from profile_analyzer import ProfileAnalyzer
from job_scraper import JobScraper

class ApplicationAgent:
    def __init__(self, user_id: str, auth_token: str):
        self.config = Config()
        self.user_id = user_id
        self.auth_token = auth_token
        self.logger = logging.getLogger(__name__)
        
        # Initialize components
        self.profile_analyzer = ProfileAnalyzer()
        self.job_scraper = JobScraper()
        self.driver = None
        
        # Database setup
        self.db_path = self.config.SQLITE_DB
        self._setup_database()
        
        # Application tracking
        self.applications_today = 0
        self.applications_this_hour = 0
        self.last_application_time = None
        
    def _setup_database(self):
        """Setup SQLite database for tracking applications"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS applications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    job_id TEXT NOT NULL,
                    job_title TEXT NOT NULL,
                    company TEXT NOT NULL,
                    job_url TEXT NOT NULL,
                    match_score REAL NOT NULL,
                    status TEXT DEFAULT 'applied',
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    cover_letter TEXT,
                    response_received BOOLEAN DEFAULT FALSE,
                    response_date TIMESTAMP NULL
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS application_limits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    date DATE NOT NULL,
                    applications_count INTEGER DEFAULT 0,
                    last_application_time TIMESTAMP NULL,
                    UNIQUE(user_id, date)
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error setting up database: {e}")
    
    def setup_driver(self):
        """Setup Chrome driver for job applications"""
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
                chrome_options.add_argument(f"--user-agent={UserAgent().random}")
            
            self.driver = webdriver.Chrome(
                ChromeDriverManager().install(),
                options=chrome_options
            )
            
            # Execute anti-detection script
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
        except Exception as e:
            self.logger.error(f"Error setting up driver: {e}")
            raise
    
    def can_apply_now(self) -> bool:
        """Check if we can apply to a job now based on rate limits"""
        now = datetime.now()
        
        # Check daily limit
        if self.applications_today >= self.config.MAX_JOBS_PER_DAY:
            self.logger.info("Daily application limit reached")
            return False
        
        # Check hourly limit
        if self.applications_this_hour >= self.config.MAX_APPLICATIONS_PER_HOUR:
            if self.last_application_time:
                time_since_last = now - self.last_application_time
                if time_since_last.total_seconds() < 3600:  # 1 hour
                    self.logger.info("Hourly application limit reached")
                    return False
                else:
                    # Reset hourly counter
                    self.applications_this_hour = 0
        
        return True
    
    def apply_to_job(self, job: Dict, user_profile: Dict) -> bool:
        """Apply to a specific job"""
        try:
            if not self.can_apply_now():
                return False
            
            # Generate personalized cover letter
            cover_letter = self.profile_analyzer.generate_custom_cover_letter(user_profile, job)
            
            # Apply to job based on source
            success = False
            if job['source'] == 'indeed':
                success = self._apply_to_indeed_job(job, cover_letter)
            elif job['source'] == 'linkedin':
                success = self._apply_to_linkedin_job(job, cover_letter)
            elif job['source'] == 'remoteok':
                success = self._apply_to_remoteok_job(job, cover_letter)
            else:
                success = self._apply_to_generic_job(job, cover_letter)
            
            if success:
                # Update application tracking
                self._record_application(job, user_profile, cover_letter)
                self.applications_today += 1
                self.applications_this_hour += 1
                self.last_application_time = datetime.now()
                
                self.logger.info(f"Successfully applied to {job['title']} at {job['company']}")
                
                # Random delay between applications
                delay = random.uniform(
                    self.config.APPLICATION_DELAY_MIN,
                    self.config.APPLICATION_DELAY_MAX
                )
                time.sleep(delay)
                
            return success
            
        except Exception as e:
            self.logger.error(f"Error applying to job {job['title']}: {e}")
            return False
    
    def _apply_to_indeed_job(self, job: Dict, cover_letter: str) -> bool:
        """Apply to Indeed job"""
        try:
            if not self.driver:
                self.setup_driver()
            
            self.driver.get(job['url'])
            time.sleep(random.uniform(2, 4))
            
            # Look for apply button
            apply_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-indeed-apply-button]"))
            )
            
            apply_button.click()
            time.sleep(random.uniform(2, 4))
            
            # Fill in application form if available
            self._fill_application_form(cover_letter)
            
            # Submit application
            submit_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            time.sleep(random.uniform(3, 5))
            return True
            
        except Exception as e:
            self.logger.error(f"Error applying to Indeed job: {e}")
            return False
    
    def _apply_to_linkedin_job(self, job: Dict, cover_letter: str) -> bool:
        """Apply to LinkedIn job"""
        try:
            if not self.driver:
                self.setup_driver()
            
            self.driver.get(job['url'])
            time.sleep(random.uniform(2, 4))
            
            # Look for apply button
            apply_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-control-name='jobdetails_topcard_inapply']"))
            )
            
            apply_button.click()
            time.sleep(random.uniform(2, 4))
            
            # Fill in application form if available
            self._fill_application_form(cover_letter)
            
            # Submit application
            submit_button = self.driver.find_element(By.CSS_SELECTOR, "button[aria-label='Submit application']")
            submit_button.click()
            
            time.sleep(random.uniform(3, 5))
            return True
            
        except Exception as e:
            self.logger.error(f"Error applying to LinkedIn job: {e}")
            return False
    
    def _apply_to_remoteok_job(self, job: Dict, cover_letter: str) -> bool:
        """Apply to RemoteOK job"""
        try:
            if not self.driver:
                self.setup_driver()
            
            self.driver.get(job['url'])
            time.sleep(random.uniform(2, 4))
            
            # RemoteOK usually redirects to external application forms
            # We'll try to fill basic information if possible
            self._fill_application_form(cover_letter)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error applying to RemoteOK job: {e}")
            return False
    
    def _apply_to_generic_job(self, job: Dict, cover_letter: str) -> bool:
        """Apply to generic job posting"""
        try:
            if not self.driver:
                self.setup_driver()
            
            self.driver.get(job['url'])
            time.sleep(random.uniform(2, 4))
            
            # Try to fill application form
            self._fill_application_form(cover_letter)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error applying to generic job: {e}")
            return False
    
    def _fill_application_form(self, cover_letter: str):
        """Fill in common application form fields"""
        try:
            # Look for common form fields
            form_fields = {
                'name': ['input[name*="name" i]', 'input[id*="name" i]', 'input[placeholder*="name" i]'],
                'email': ['input[name*="email" i]', 'input[id*="email" i]', 'input[type="email"]'],
                'phone': ['input[name*="phone" i]', 'input[id*="phone" i]', 'input[type="tel"]'],
                'cover_letter': ['textarea[name*="cover" i]', 'textarea[id*="cover" i]', 'textarea[name*="letter" i]']
            }
            
            # Fill name field
            for selector in form_fields['name']:
                try:
                    name_field = self.driver.find_element(By.CSS_SELECTOR, selector)
                    name_field.send_keys("AI Agent User")
                    break
                except:
                    continue
            
            # Fill email field
            for selector in form_fields['email']:
                try:
                    email_field = self.driver.find_element(By.CSS_SELECTOR, selector)
                    email_field.send_keys("ai.agent@example.com")
                    break
                except:
                    continue
            
            # Fill cover letter
            for selector in form_fields['cover_letter']:
                try:
                    cover_field = self.driver.find_element(By.CSS_SELECTOR, selector)
                    cover_field.send_keys(cover_letter)
                    break
                except:
                    continue
                    
        except Exception as e:
            self.logger.warning(f"Error filling application form: {e}")
    
    def _record_application(self, job: Dict, user_profile: Dict, cover_letter: str):
        """Record application in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO applications 
                (user_id, job_id, job_title, company, job_url, match_score, cover_letter)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                self.user_id,
                f"{job['title']}_{job['company']}",
                job['title'],
                job['company'],
                job['url'],
                job.get('match_score', 0.0),
                cover_letter
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error recording application: {e}")
    
    def run_autonomous_application_cycle(self, user_profile: Dict, search_queries: List[str]):
        """Run the main autonomous application cycle"""
        try:
            self.logger.info("Starting autonomous application cycle")
            
            # Reset daily counters if it's a new day
            self._reset_daily_counters()
            
            # Scrape jobs from all sources
            all_jobs = []
            for query in search_queries:
                jobs = self.job_scraper.scrape_all_sources(query, limit_per_source=10)
                all_jobs.extend(jobs)
                time.sleep(random.uniform(1, 3))
            
            # Remove duplicates
            unique_jobs = []
            seen = set()
            for job in all_jobs:
                key = f"{job['title']}_{job['company']}"
                if key not in seen:
                    seen.add(key)
                    unique_jobs.append(job)
            
            # Calculate match scores and sort by relevance
            scored_jobs = []
            for job in unique_jobs:
                match_score = self.profile_analyzer.calculate_job_match_score(user_profile, job)
                job['match_score'] = match_score
                
                if match_score >= self.config.MIN_MATCH_SCORE:
                    scored_jobs.append(job)
            
            # Sort by match score (highest first)
            scored_jobs.sort(key=lambda x: x['match_score'], reverse=True)
            
            self.logger.info(f"Found {len(scored_jobs)} jobs with match score >= {self.config.MIN_MATCH_SCORE}")
            
            # Apply to top matching jobs
            applications_made = 0
            for job in scored_jobs:
                if not self.can_apply_now():
                    self.logger.info("Application limits reached for this cycle")
                    break
                
                if self.apply_to_job(job, user_profile):
                    applications_made += 1
                    self.logger.info(f"Applied to {job['title']} at {job['company']} (Score: {job['match_score']:.2f})")
                
                if applications_made >= self.config.MAX_JOBS_PER_DAY:
                    self.logger.info("Daily application limit reached")
                    break
            
            self.logger.info(f"Application cycle completed. Applied to {applications_made} jobs.")
            
        except Exception as e:
            self.logger.error(f"Error in autonomous application cycle: {e}")
        finally:
            if self.driver:
                self.driver.quit()
    
    def _reset_daily_counters(self):
        """Reset daily application counters"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            today = datetime.now().date()
            
            # Check if we have a record for today
            cursor.execute('''
                SELECT applications_count FROM application_limits 
                WHERE user_id = ? AND date = ?
            ''', (self.user_id, today))
            
            result = cursor.fetchone()
            
            if result:
                # Update existing record
                cursor.execute('''
                    UPDATE application_limits 
                    SET applications_count = 0, last_application_time = NULL
                    WHERE user_id = ? AND date = ?
                ''', (self.user_id, today))
            else:
                # Create new record for today
                cursor.execute('''
                    INSERT INTO application_limits (user_id, date, applications_count)
                    VALUES (?, ?, 0)
                ''', (self.user_id, today))
            
            conn.commit()
            conn.close()
            
            # Reset in-memory counters
            self.applications_today = 0
            self.applications_this_hour = 0
            self.last_application_time = None
            
        except Exception as e:
            self.logger.error(f"Error resetting daily counters: {e}")
    
    def get_application_stats(self) -> Dict:
        """Get application statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Today's applications
            today = datetime.now().date()
            cursor.execute('''
                SELECT COUNT(*) FROM applications 
                WHERE user_id = ? AND DATE(applied_at) = ?
            ''', (self.user_id, today))
            
            today_count = cursor.fetchone()[0]
            
            # Total applications
            cursor.execute('''
                SELECT COUNT(*) FROM applications WHERE user_id = ?
            ''', (self.user_id,))
            
            total_count = cursor.fetchone()[0]
            
            # Response rate
            cursor.execute('''
                SELECT COUNT(*) FROM applications 
                WHERE user_id = ? AND response_received = TRUE
            ''', (self.user_id,))
            
            responses = cursor.fetchone()[0]
            response_rate = (responses / total_count * 100) if total_count > 0 else 0
            
            conn.close()
            
            return {
                "applications_today": today_count,
                "total_applications": total_count,
                "response_rate": round(response_rate, 2),
                "daily_limit": self.config.MAX_JOBS_PER_DAY,
                "hourly_limit": self.config.MAX_APPLICATIONS_PER_HOUR
            }
            
        except Exception as e:
            self.logger.error(f"Error getting application stats: {e}")
            return {}
    
    def close(self):
        """Cleanup resources"""
        if self.driver:
            self.driver.quit()
        if self.job_scraper:
            self.job_scraper.close_driver()
