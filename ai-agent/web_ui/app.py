from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_socketio import SocketIO, emit
import os
import sys
import json
import threading
import time
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from profile_analyzer import ProfileAnalyzer
from job_scraper import JobScraper
from application_agent import ApplicationAgent
from scheduler import JobApplicationScheduler

app = Flask(__name__)
app.secret_key = 'ai_agent_secret_key_2024'
socketio = SocketIO(app, cors_allowed_origins="*")

# Global scheduler instance
scheduler = None
user_sessions = {}

# Indian job sources and queries
INDIAN_JOB_SOURCES = [
    "naukri",
    "indeed_india", 
    "linkedin_india",
    "monster_india",
    "shine",
    "timesjobs"
]

INDIAN_CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", 
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
    "Remote", "Work from Home"
]

INDIAN_TECH_QUERIES = [
    "Python Developer", "Java Developer", "React Developer",
    "Full Stack Developer", "Data Scientist", "DevOps Engineer",
    "Software Engineer", "Frontend Developer", "Backend Developer",
    "Machine Learning Engineer", "AI Engineer", "Cloud Engineer"
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        user_id = data.get('user_id')
        auth_token = data.get('auth_token')
        
        if user_id and auth_token:
            session['user_id'] = user_id
            session['auth_token'] = auth_token
            return jsonify({'success': True, 'redirect': '/dashboard'})
        else:
            return jsonify({'success': False, 'error': 'Invalid credentials'})
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/api/profile', methods=['GET', 'POST'])
def profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if request.method == 'POST':
        data = request.get_json()
        user_id = session['user_id']
        
        # Store profile in session (in production, use database)
        if 'profiles' not in session:
            session['profiles'] = {}
        
        session['profiles'][user_id] = data
        return jsonify({'success': True})
    
    # Return profile if exists
    user_id = session['user_id']
    profile = session.get('profiles', {}).get(user_id, {})
    return jsonify(profile)

@app.route('/api/jobs/search', methods=['POST'])
def search_jobs():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    query = data.get('query', 'Python Developer')
    location = data.get('location', 'Mumbai')
    limit = data.get('limit', 20)
    
    try:
        # Initialize job scraper
        scraper = JobScraper()
        
        # Search for jobs (focus on Indian sources)
        jobs = []
        
        # Add Indian-specific job sources
        if 'naukri' in INDIAN_JOB_SOURCES:
            try:
                naukri_jobs = scraper.scrape_naukri_jobs(query, location, limit//2)
                jobs.extend(naukri_jobs)
            except Exception as e:
                print(f"Error scraping Naukri: {e}")
        
        if 'indeed_india' in INDIAN_JOB_SOURCES:
            try:
                indeed_jobs = scraper.scrape_indeed_jobs(query, location, limit//2)
                jobs.extend(indeed_jobs)
            except Exception as e:
                print(f"Error scraping Indeed India: {e}")
        
        # Remove duplicates
        unique_jobs = []
        seen = set()
        for job in jobs:
            key = f"{job['title']}_{job['company']}"
            if key not in seen:
                seen.add(key)
                unique_jobs.append(job)
        
        scraper.close_driver()
        
        return jsonify({
            'success': True,
            'jobs': unique_jobs[:limit],
            'total': len(unique_jobs)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/jobs/apply', methods=['POST'])
def apply_to_job():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    job_id = data.get('job_id')
    user_id = session['user_id']
    
    try:
        # Get user profile
        profile = session.get('profiles', {}).get(user_id, {})
        if not profile:
            return jsonify({'error': 'Profile not found'}), 400
        
        # Initialize application agent
        agent = ApplicationAgent(user_id, session.get('auth_token', ''))
        
        # Get job details (in production, fetch from database)
        job = {
            'title': data.get('title', ''),
            'company': data.get('company', ''),
            'location': data.get('location', ''),
            'url': data.get('url', ''),
            'source': data.get('source', 'generic')
        }
        
        # Apply to job
        success = agent.apply_to_job(job, profile)
        
        if success:
            return jsonify({'success': True, 'message': 'Application submitted successfully'})
        else:
            return jsonify({'error': 'Failed to submit application'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agent/start', methods=['POST'])
def start_agent():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    global scheduler
    user_id = session['user_id']
    
    try:
        # Initialize scheduler if not exists
        if scheduler is None:
            scheduler = JobApplicationScheduler()
        
        # Get user profile and search queries
        profile = session.get('profiles', {}).get(user_id, {})
        if not profile:
            return jsonify({'error': 'Profile not found'}), 400
        
        # Generate Indian-focused search queries
        search_queries = INDIAN_TECH_QUERIES[:5]  # Top 5 queries
        
        # Add user to scheduler
        scheduler.add_user(user_id, session.get('auth_token', ''), profile, search_queries)
        
        # Start scheduler if not running
        if not scheduler.running:
            scheduler.start_scheduler()
        
        return jsonify({
            'success': True, 
            'message': 'AI Agent started successfully',
            'search_queries': search_queries
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agent/stop', methods=['POST'])
def stop_agent():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    global scheduler
    user_id = session['user_id']
    
    try:
        if scheduler:
            scheduler.remove_user(user_id)
            return jsonify({'success': True, 'message': 'AI Agent stopped successfully'})
        else:
            return jsonify({'error': 'No scheduler running'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agent/status')
def agent_status():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    global scheduler
    user_id = session['user_id']
    
    try:
        if scheduler and user_id in scheduler.agents:
            stats = scheduler.get_user_stats(user_id)
            status = scheduler.get_scheduler_status()
            return jsonify({
                'success': True,
                'stats': stats,
                'scheduler_status': status,
                'active': True
            })
        else:
            return jsonify({
                'success': True,
                'active': False,
                'stats': {},
                'scheduler_status': {}
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agent/run-cycle', methods=['POST'])
def run_manual_cycle():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    global scheduler
    user_id = session['user_id']
    
    try:
        if scheduler:
            result = scheduler.run_manual_application_cycle(user_id)
            return jsonify(result)
        else:
            return jsonify({'error': 'No scheduler running'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/jobs/indian-sources')
def get_indian_sources():
    return jsonify({
        'sources': INDIAN_JOB_SOURCES,
        'cities': INDIAN_CITIES,
        'queries': INDIAN_TECH_QUERIES
    })

@app.route('/api/jobs/recommendations')
def get_job_recommendations():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    profile = session.get('profiles', {}).get(user_id, {})
    
    if not profile:
        return jsonify({'error': 'Profile not found'}), 400
    
    try:
        # Get user skills
        skills = profile.get('skills', [])
        
        # Generate recommendations based on skills
        recommendations = []
        for skill in skills[:3]:  # Top 3 skills
            for city in INDIAN_CITIES[:5]:  # Top 5 cities
                recommendations.append({
                    'query': f"{skill} Developer",
                    'location': city,
                    'priority': 'high' if city in ['Mumbai', 'Delhi', 'Bangalore'] else 'medium'
                })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5001)
