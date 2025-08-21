import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Configuration
    BACKEND_API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:5000')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    # Job Application Limits
    MAX_JOBS_PER_DAY = 100
    MAX_APPLICATIONS_PER_HOUR = 10
    MIN_MATCH_SCORE = 0.7
    
    # AI Model Settings
    AI_MODEL = "gpt-3.5-turbo"
    MAX_TOKENS = 1000
    TEMPERATURE = 0.3
    
    # Job Search Parameters
    SEARCH_DELAY_MIN = 2
    SEARCH_DELAY_MAX = 5
    APPLICATION_DELAY_MIN = 30
    APPLICATION_DELAY_MAX = 120
    
    # Profile Matching Weights
    SKILLS_WEIGHT = 0.4
    EXPERIENCE_WEIGHT = 0.3
    LOCATION_WEIGHT = 0.2
    SALARY_WEIGHT = 0.1
    
    # Browser Settings
    HEADLESS_MODE = True
    USER_AGENT_ROTATION = True
    PROXY_ROTATION = False
    
    # Logging
    LOG_LEVEL = "INFO"
    LOG_FILE = "ai_agent.log"
    
    # Database
    SQLITE_DB = "ai_agent.db"
    
    # Job Sources
    JOB_SOURCES = [
        "indeed",
        "linkedin", 
        "glassdoor",
        "remoteok",
        "wellfound"
    ]
