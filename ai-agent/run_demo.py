#!/usr/bin/env python3
"""
Quick demo script for the AI Job Application Agent
Run this to test the system without full configuration
"""

import os
import sys
import logging
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import Config
from profile_analyzer import ProfileAnalyzer
from job_scraper import JobScraper

def setup_logging():
    """Setup basic logging"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

def run_profile_analysis_demo():
    """Demo the profile analysis functionality"""
    print("🔍 Profile Analysis Demo")
    print("=" * 50)
    
    # Sample user profile
    sample_profile = {
        "fullName": "John Doe",
        "email": "john.doe@example.com",
        "location": "San Francisco, CA",
        "skills": [
            "Python", "JavaScript", "React", "Node.js", "MongoDB",
            "Machine Learning", "Data Analysis", "API Development"
        ],
        "experience": "5-7 years",
        "education": "Master's Degree",
        "resume_headline": "Senior Full Stack Developer with ML Expertise"
    }
    
    print(f"Analyzing profile for: {sample_profile['fullName']}")
    print(f"Skills: {', '.join(sample_profile['skills'])}")
    print(f"Experience: {sample_profile['experience']}")
    print(f"Location: {sample_profile['location']}")
    
    try:
        # Initialize profile analyzer
        analyzer = ProfileAnalyzer()
        
        # Analyze profile
        print("\n🤖 AI Analysis Results:")
        print("-" * 30)
        
        analysis = analyzer.analyze_user_profile(sample_profile)
        
        print(f"Experience Level: {analysis.get('experience_level', 'N/A')}")
        print(f"Preferred Roles: {', '.join(analysis.get('preferred_roles', []))}")
        print(f"Location Preferences: {', '.join(analysis.get('location_preferences', []))}")
        print(f"Remote Preference: {analysis.get('remote_preference', 'N/A')}")
        print(f"Industry Preferences: {', '.join(analysis.get('industry_preferences', []))}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in profile analysis: {e}")
        return False

def run_job_matching_demo():
    """Demo the job matching functionality"""
    print("\n🎯 Job Matching Demo")
    print("=" * 50)
    
    # Sample user profile
    user_profile = {
        "fullName": "Jane Smith",
        "skills": ["Python", "Django", "PostgreSQL", "AWS"],
        "experience": "3-5 years",
        "location": "Remote"
    }
    
    # Sample job postings
    sample_jobs = [
        {
            "title": "Senior Python Developer",
            "company": "TechCorp",
            "location": "Remote",
            "requirements": ["Python", "Django", "PostgreSQL", "AWS", "Docker"],
            "salary": "$120,000 - $150,000"
        },
        {
            "title": "Frontend Developer",
            "company": "WebSolutions",
            "location": "New York, NY",
            "requirements": ["JavaScript", "React", "HTML", "CSS"],
            "salary": "$80,000 - $100,000"
        },
        {
            "title": "Python Backend Developer",
            "company": "DataFlow",
            "location": "Remote",
            "requirements": ["Python", "FastAPI", "MongoDB", "Redis"],
            "salary": "$90,000 - $120,000"
        }
    ]
    
    print(f"User Profile: {user_profile['fullName']}")
    print(f"Skills: {', '.join(user_profile['skills'])}")
    print(f"Experience: {user_profile['experience']}")
    
    try:
        # Initialize profile analyzer
        analyzer = ProfileAnalyzer()
        
        print("\n🤖 Job Matching Results:")
        print("-" * 30)
        
        for i, job in enumerate(sample_jobs, 1):
            print(f"\nJob {i}: {job['title']} at {job['company']}")
            print(f"Requirements: {', '.join(job['requirements'])}")
            print(f"Location: {job['location']}")
            print(f"Salary: {job['salary']}")
            
            # Calculate match score
            match_score = analyzer.calculate_job_match_score(user_profile, job)
            print(f"Match Score: {match_score:.2f} ({match_score*100:.0f}%)")
            
            # Generate cover letter
            cover_letter = analyzer.generate_custom_cover_letter(user_profile, job)
            print(f"Cover Letter Preview: {cover_letter[:100]}...")
            
        return True
        
    except Exception as e:
        print(f"❌ Error in job matching: {e}")
        return False

def run_job_scraping_demo():
    """Demo the job scraping functionality"""
    print("\n🔍 Job Scraping Demo")
    print("=" * 50)
    
    print("Note: This demo will attempt to scrape real job sites.")
    print("Make sure you have Chrome installed and internet connection.")
    
    try:
        # Initialize job scraper
        scraper = JobScraper()
        
        # Test scraping (small limit for demo)
        search_query = "python developer"
        print(f"\nSearching for: '{search_query}'")
        
        print("Scraping from multiple sources...")
        jobs = scraper.scrape_all_sources(search_query, limit_per_source=3)
        
        print(f"\nFound {len(jobs)} unique jobs:")
        print("-" * 30)
        
        for i, job in enumerate(jobs[:5], 1):  # Show first 5
            print(f"{i}. {job['title']}")
            print(f"   Company: {job['company']}")
            print(f"   Location: {job['location']}")
            print(f"   Source: {job['source']}")
            print(f"   URL: {job['url'][:60]}...")
            print()
        
        # Cleanup
        scraper.close_driver()
        return True
        
    except Exception as e:
        print(f"❌ Error in job scraping: {e}")
        print("This might be due to:")
        print("- Chrome not installed")
        print("- Internet connection issues")
        print("- Job site structure changes")
        return False

def main():
    """Run all demos"""
    print("🚀 AI Job Application Agent - Demo Mode")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Setup logging
    setup_logging()
    
    # Run demos
    demos = [
        ("Profile Analysis", run_profile_analysis_demo),
        ("Job Matching", run_job_matching_demo),
        ("Job Scraping", run_job_scraping_demo)
    ]
    
    results = []
    
    for demo_name, demo_func in demos:
        try:
            print(f"\n{'='*20} {demo_name} {'='*20}")
            success = demo_func()
            results.append((demo_name, success))
            
            if success:
                print(f"✅ {demo_name} completed successfully")
            else:
                print(f"❌ {demo_name} failed")
                
        except Exception as e:
            print(f"❌ {demo_name} crashed: {e}")
            results.append((demo_name, False))
    
    # Summary
    print("\n" + "="*60)
    print("📊 Demo Summary")
    print("="*60)
    
    successful = sum(1 for _, success in results if success)
    total = len(results)
    
    for demo_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{demo_name}: {status}")
    
    print(f"\nOverall: {successful}/{total} demos passed")
    
    if successful == total:
        print("🎉 All demos passed! The system is working correctly.")
    elif successful > 0:
        print("⚠️  Some demos passed. Check the failed ones for issues.")
    else:
        print("❌ All demos failed. Check your setup and configuration.")
    
    print("\n💡 Next Steps:")
    print("1. Set up your OpenAI API key in .env file")
    print("2. Edit user_config.json with your details")
    print("3. Run: python main.py --mode demo")
    print("4. Run: python main.py --mode multi")

if __name__ == "__main__":
    main()
