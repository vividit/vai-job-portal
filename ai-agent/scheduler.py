import schedule
import time
import logging
import threading
from datetime import datetime, timedelta
from typing import Dict, List
import requests
import json

from config import Config
from application_agent import ApplicationAgent

class JobApplicationScheduler:
    def __init__(self):
        self.config = Config()
        self.logger = logging.getLogger(__name__)
        self.running = False
        self.agents = {}  # user_id -> ApplicationAgent
        self.user_profiles = {}  # user_id -> profile_data
        self.search_queries = {}  # user_id -> search_queries
        
    def start_scheduler(self):
        """Start the main scheduler"""
        self.logger.info("Starting Job Application Scheduler")
        self.running = True
        
        # Schedule daily job application cycles
        schedule.every().day.at("09:00").do(self.run_daily_application_cycle)
        schedule.every().day.at("14:00").do(self.run_daily_application_cycle)
        schedule.every().day.at("18:00").do(self.run_daily_application_cycle)
        
        # Schedule hourly job discovery (without applications)
        schedule.every().hour.do(self.run_job_discovery_cycle)
        
        # Schedule weekly profile optimization
        schedule.every().monday.at("10:00").do(self.run_weekly_profile_optimization)
        
        # Start the scheduler in a separate thread
        scheduler_thread = threading.Thread(target=self._run_scheduler_loop)
        scheduler_thread.daemon = True
        scheduler_thread.start()
        
        self.logger.info("Scheduler started successfully")
    
    def _run_scheduler_loop(self):
        """Main scheduler loop"""
        while self.running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                self.logger.error(f"Error in scheduler loop: {e}")
                time.sleep(300)  # Wait 5 minutes on error
    
    def stop_scheduler(self):
        """Stop the scheduler"""
        self.logger.info("Stopping Job Application Scheduler")
        self.running = False
        
        # Close all agents
        for agent in self.agents.values():
            try:
                agent.close()
            except Exception as e:
                self.logger.error(f"Error closing agent: {e}")
        
        self.agents.clear()
        self.logger.info("Scheduler stopped")
    
    def add_user(self, user_id: str, auth_token: str, profile_data: Dict, search_queries: List[str]):
        """Add a user to the autonomous application system"""
        try:
            self.logger.info(f"Adding user {user_id} to autonomous application system")
            
            # Create application agent for user
            agent = ApplicationAgent(user_id, auth_token)
            self.agents[user_id] = agent
            
            # Store user profile and search queries
            self.user_profiles[user_id] = profile_data
            self.search_queries[user_id] = search_queries
            
            self.logger.info(f"User {user_id} added successfully")
            
        except Exception as e:
            self.logger.error(f"Error adding user {user_id}: {e}")
    
    def remove_user(self, user_id: str):
        """Remove a user from the autonomous application system"""
        try:
            self.logger.info(f"Removing user {user_id} from autonomous application system")
            
            if user_id in self.agents:
                self.agents[user_id].close()
                del self.agents[user_id]
            
            if user_id in self.user_profiles:
                del self.user_profiles[user_id]
            
            if user_id in self.search_queries:
                del self.search_queries[user_id]
            
            self.logger.info(f"User {user_id} removed successfully")
            
        except Exception as e:
            self.logger.error(f"Error removing user {user_id}: {e}")
    
    def run_daily_application_cycle(self):
        """Run the main daily application cycle for all users"""
        self.logger.info("Starting daily application cycle")
        
        for user_id, agent in self.agents.items():
            try:
                if user_id in self.user_profiles and user_id in self.search_queries:
                    profile = self.user_profiles[user_id]
                    queries = self.search_queries[user_id]
                    
                    self.logger.info(f"Running application cycle for user {user_id}")
                    
                    # Run in separate thread to avoid blocking
                    thread = threading.Thread(
                        target=agent.run_autonomous_application_cycle,
                        args=(profile, queries)
                    )
                    thread.daemon = True
                    thread.start()
                    
                    # Small delay between users
                    time.sleep(10)
                    
            except Exception as e:
                self.logger.error(f"Error running application cycle for user {user_id}: {e}")
        
        self.logger.info("Daily application cycle completed")
    
    def run_job_discovery_cycle(self):
        """Run job discovery cycle (without applications)"""
        self.logger.info("Starting job discovery cycle")
        
        for user_id, agent in self.agents.items():
            try:
                if user_id in self.user_profiles and user_id in self.search_queries:
                    profile = self.user_profiles[user_id]
                    queries = self.search_queries[user_id]
                    
                    # Just discover jobs, don't apply
                    self._discover_jobs_for_user(user_id, profile, queries)
                    
            except Exception as e:
                self.logger.error(f"Error in job discovery for user {user_id}: {e}")
        
        self.logger.info("Job discovery cycle completed")
    
    def _discover_jobs_for_user(self, user_id: str, profile: Dict, queries: List[str]):
        """Discover jobs for a specific user without applying"""
        try:
            agent = self.agents[user_id]
            
            # Use job scraper to find jobs
            all_jobs = []
            for query in queries:
                jobs = agent.job_scraper.scrape_all_sources(query, limit_per_source=5)
                all_jobs.extend(jobs)
                time.sleep(1)
            
            # Calculate match scores
            scored_jobs = []
            for job in all_jobs:
                match_score = agent.profile_analyzer.calculate_job_match_score(profile, job)
                job['match_score'] = match_score
                
                if match_score >= self.config.MIN_MATCH_SCORE:
                    scored_jobs.append(job)
            
            # Sort by match score
            scored_jobs.sort(key=lambda x: x['match_score'], reverse=True)
            
            self.logger.info(f"User {user_id}: Found {len(scored_jobs)} matching jobs")
            
            # Store discovered jobs for later application
            self._store_discovered_jobs(user_id, scored_jobs[:20])  # Top 20 matches
            
        except Exception as e:
            self.logger.error(f"Error discovering jobs for user {user_id}: {e}")
    
    def _store_discovered_jobs(self, user_id: str, jobs: List[Dict]):
        """Store discovered jobs for later application"""
        try:
            # This could be extended to store in a database
            # For now, we'll just log them
            for job in jobs:
                self.logger.info(f"Discovered job for user {user_id}: {job['title']} at {job['company']} (Score: {job['match_score']:.2f})")
                
        except Exception as e:
            self.logger.error(f"Error storing discovered jobs: {e}")
    
    def run_weekly_profile_optimization(self):
        """Run weekly profile optimization for all users"""
        self.logger.info("Starting weekly profile optimization")
        
        for user_id, profile in self.user_profiles.items():
            try:
                self.logger.info(f"Optimizing profile for user {user_id}")
                
                # Run profile optimization in separate thread
                thread = threading.Thread(
                    target=self._optimize_user_profile,
                    args=(user_id, profile)
                )
                thread.daemon = True
                thread.start()
                
                time.sleep(5)
                
            except Exception as e:
                self.logger.error(f"Error optimizing profile for user {user_id}: {e}")
        
        self.logger.info("Weekly profile optimization completed")
    
    def _optimize_user_profile(self, user_id: str, profile: Dict):
        """Optimize user profile based on job market analysis"""
        try:
            # This could include:
            # - Analyzing successful applications
            # - Identifying skill gaps
            # - Suggesting profile improvements
            # - Updating search queries
            
            self.logger.info(f"Profile optimization completed for user {user_id}")
            
        except Exception as e:
            self.logger.error(f"Error optimizing profile for user {user_id}: {e}")
    
    def get_user_stats(self, user_id: str) -> Dict:
        """Get statistics for a specific user"""
        try:
            if user_id in self.agents:
                return self.agents[user_id].get_application_stats()
            else:
                return {"error": "User not found"}
                
        except Exception as e:
            self.logger.error(f"Error getting stats for user {user_id}: {e}")
            return {"error": str(e)}
    
    def get_all_stats(self) -> Dict:
        """Get statistics for all users"""
        try:
            all_stats = {}
            for user_id in self.agents.keys():
                all_stats[user_id] = self.get_user_stats(user_id)
            return all_stats
            
        except Exception as e:
            self.logger.error(f"Error getting all stats: {e}")
            return {"error": str(e)}
    
    def run_manual_application_cycle(self, user_id: str):
        """Run a manual application cycle for a specific user"""
        try:
            if user_id not in self.agents:
                raise ValueError(f"User {user_id} not found")
            
            if user_id not in self.user_profiles or user_id not in self.search_queries:
                raise ValueError(f"Profile or search queries not found for user {user_id}")
            
            profile = self.user_profiles[user_id]
            queries = self.search_queries[user_id]
            agent = self.agents[user_id]
            
            self.logger.info(f"Running manual application cycle for user {user_id}")
            
            # Run in separate thread
            thread = threading.Thread(
                target=agent.run_autonomous_application_cycle,
                args=(profile, queries)
            )
            thread.daemon = True
            thread.start()
            
            return {"success": True, "message": "Manual application cycle started"}
            
        except Exception as e:
            self.logger.error(f"Error running manual application cycle: {e}")
            return {"success": False, "error": str(e)}
    
    def update_user_search_queries(self, user_id: str, new_queries: List[str]):
        """Update search queries for a user"""
        try:
            if user_id in self.search_queries:
                self.search_queries[user_id] = new_queries
                self.logger.info(f"Updated search queries for user {user_id}: {new_queries}")
                return True
            else:
                self.logger.warning(f"User {user_id} not found for query update")
                return False
                
        except Exception as e:
            self.logger.error(f"Error updating search queries for user {user_id}: {e}")
            return False
    
    def get_scheduler_status(self) -> Dict:
        """Get current scheduler status"""
        return {
            "running": self.running,
            "active_users": len(self.agents),
            "next_job_discovery": schedule.next_run().strftime("%Y-%m-%d %H:%M:%S") if schedule.next_run() else "None",
            "next_application_cycle": schedule.next_run().strftime("%Y-%m-%d %H:%M:%S") if schedule.next_run() else "None"
        }
