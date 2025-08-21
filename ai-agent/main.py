#!/usr/bin/env python3
"""
Autonomous AI Job Application System
Main entry point for running the autonomous job application agent
"""

import os
import sys
import logging
import argparse
import json
import time
from datetime import datetime
from typing import Dict, List

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import Config
from scheduler import JobApplicationScheduler
from application_agent import ApplicationAgent
from profile_analyzer import ProfileAnalyzer

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('ai_agent.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )

def load_user_config(config_file: str) -> Dict:
    """Load user configuration from file"""
    try:
        with open(config_file, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Configuration file {config_file} not found. Creating default config...")
        return create_default_config(config_file)
    except json.JSONDecodeError:
        print(f"Invalid JSON in {config_file}. Creating new config...")
        return create_default_config(config_file)

def create_default_config(config_file: str) -> Dict:
    """Create default user configuration"""
    default_config = {
        "users": [
            {
                "user_id": "user1",
                "auth_token": "your_auth_token_here",
                "search_queries": [
                    "python developer",
                    "software engineer",
                    "full stack developer",
                    "data scientist",
                    "machine learning engineer"
                ],
                "profile": {
                    "fullName": "AI Agent User",
                    "email": "ai.agent@example.com",
                    "location": "Remote",
                    "skills": [
                        "Python", "JavaScript", "React", "Node.js", "MongoDB",
                        "Machine Learning", "Data Analysis", "API Development"
                    ],
                    "experience": "3-5 years",
                    "education": "Bachelor's Degree",
                    "resume_headline": "Full Stack Developer with ML Experience"
                }
            }
        ],
        "settings": {
            "max_jobs_per_day": 100,
            "max_applications_per_hour": 10,
            "min_match_score": 0.7,
            "headless_mode": True,
            "auto_start": True
        }
    }
    
    try:
        with open(config_file, 'w') as f:
            json.dump(default_config, f, indent=2)
        print(f"Default configuration created at {config_file}")
        print("Please edit the configuration file with your actual details before running.")
        return default_config
    except Exception as e:
        print(f"Error creating default config: {e}")
        return default_config

def run_single_user_mode(user_config: Dict):
    """Run the system for a single user"""
    config = Config()
    logger = logging.getLogger(__name__)
    
    user = user_config["users"][0]
    user_id = user["user_id"]
    auth_token = user["auth_token"]
    profile = user["profile"]
    search_queries = user["search_queries"]
    
    logger.info(f"Starting single user mode for {user_id}")
    
    try:
        # Create and run application agent
        agent = ApplicationAgent(user_id, auth_token)
        
        # Run one application cycle
        logger.info("Running initial application cycle...")
        agent.run_autonomous_application_cycle(profile, search_queries)
        
        # Show stats
        stats = agent.get_application_stats()
        logger.info(f"Application stats: {json.dumps(stats, indent=2)}")
        
        agent.close()
        
    except Exception as e:
        logger.error(f"Error in single user mode: {e}")
        raise

def run_multi_user_mode(user_config: Dict):
    """Run the system for multiple users with scheduler"""
    logger = logging.getLogger(__name__)
    
    try:
        # Create scheduler
        scheduler = JobApplicationScheduler()
        
        # Add users to scheduler
        for user in user_config["users"]:
            user_id = user["user_id"]
            auth_token = user["auth_token"]
            profile = user["profile"]
            search_queries = user["search_queries"]
            
            logger.info(f"Adding user {user_id} to scheduler")
            scheduler.add_user(user_id, auth_token, profile, search_queries)
        
        # Start scheduler
        if user_config["settings"]["auto_start"]:
            logger.info("Starting scheduler...")
            scheduler.start_scheduler()
            
            try:
                # Keep running
                while True:
                    time.sleep(60)
                    status = scheduler.get_scheduler_status()
                    logger.info(f"Scheduler status: {status}")
                    
            except KeyboardInterrupt:
                logger.info("Received interrupt signal, stopping scheduler...")
                scheduler.stop_scheduler()
        else:
            logger.info("Scheduler created but not started (auto_start = false)")
            logger.info("Use scheduler.start_scheduler() to start manually")
            
            # Show available commands
            print("\nAvailable commands:")
            print("- scheduler.start_scheduler() - Start the scheduler")
            print("- scheduler.stop_scheduler() - Stop the scheduler")
            print("- scheduler.get_scheduler_status() - Get status")
            print("- scheduler.run_manual_application_cycle('user_id') - Run manual cycle")
            print("- scheduler.get_user_stats('user_id') - Get user stats")
            
            # Interactive mode
            while True:
                try:
                    command = input("\nEnter command (or 'quit' to exit): ").strip()
                    if command.lower() == 'quit':
                        break
                    
                    # Execute command
                    exec(f"result = {command}")
                    if 'result' in locals():
                        print(f"Result: {result}")
                        
                except Exception as e:
                    print(f"Error executing command: {e}")
        
    except Exception as e:
        logger.error(f"Error in multi-user mode: {e}")
        raise

def run_demo_mode():
    """Run a demo with sample data"""
    logger = logging.getLogger(__name__)
    
    logger.info("Running demo mode...")
    
    # Create sample user profile
    sample_profile = {
        "fullName": "Demo User",
        "email": "demo@example.com",
        "location": "Remote",
        "skills": ["Python", "JavaScript", "React", "Node.js"],
        "experience": "2-3 years",
        "education": "Bachelor's Degree",
        "resume_headline": "Full Stack Developer"
    }
    
    sample_queries = ["python developer", "javascript developer", "react developer"]
    
    try:
        # Create application agent
        agent = ApplicationAgent("demo_user", "demo_token")
        
        # Run one cycle
        logger.info("Running demo application cycle...")
        agent.run_autonomous_application_cycle(sample_profile, sample_queries)
        
        # Show stats
        stats = agent.get_application_stats()
        logger.info(f"Demo stats: {json.dumps(stats, indent=2)}")
        
        agent.close()
        
    except Exception as e:
        logger.error(f"Error in demo mode: {e}")
        raise

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Autonomous AI Job Application System")
    parser.add_argument("--config", "-c", default="user_config.json", 
                       help="Path to user configuration file")
    parser.add_argument("--mode", "-m", choices=["single", "multi", "demo"], default="multi",
                       help="Operation mode: single user, multi-user with scheduler, or demo")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    # Setup logging
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    setup_logging()
    
    logger = logging.getLogger(__name__)
    logger.info("Starting Autonomous AI Job Application System")
    
    try:
        if args.mode == "demo":
            run_demo_mode()
        else:
            # Load user configuration
            user_config = load_user_config(args.config)
            
            if args.mode == "single":
                run_single_user_mode(user_config)
            else:  # multi
                run_multi_user_mode(user_config)
                
    except KeyboardInterrupt:
        logger.info("System interrupted by user")
    except Exception as e:
        logger.error(f"System error: {e}")
        sys.exit(1)
    
    logger.info("System shutdown complete")

if __name__ == "__main__":
    main()
