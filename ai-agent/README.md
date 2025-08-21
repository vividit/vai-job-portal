# Autonomous AI Job Application Agent

An intelligent, autonomous system that automatically finds and applies to jobs based on user profiles using AI-powered matching and web automation.

## 🚀 Features

- **AI-Powered Job Matching**: Uses OpenAI GPT models to analyze profiles and calculate job match scores
- **Multi-Source Job Scraping**: Scrapes jobs from Indeed, LinkedIn, RemoteOK, and other sources
- **Autonomous Applications**: Automatically fills and submits job applications
- **Smart Rate Limiting**: Respects daily/hourly application limits to avoid spam
- **Personalized Cover Letters**: Generates custom cover letters for each application
- **Scheduled Operations**: Runs automatically at scheduled intervals
- **Multi-User Support**: Handles multiple users with individual profiles and preferences
- **Anti-Detection Measures**: Uses advanced techniques to avoid bot detection

## 📁 Project Structure

```
ai-agent/
├── config.py              # Configuration and settings
├── profile_analyzer.py    # AI-powered profile analysis and job matching
├── job_scraper.py         # Web scraping for job postings
├── application_agent.py   # Autonomous job application logic
├── scheduler.py           # Task scheduling and management
├── main.py               # Main entry point
├── requirements.txt      # Python dependencies
├── README.md            # This file
└── user_config.json     # User configuration (created automatically)
```

## 🛠️ Installation

### Prerequisites

- Python 3.8+
- Chrome browser (for web automation)
- OpenAI API key

### Setup

1. **Clone and navigate to the project:**
   ```bash
   cd ai-agent
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   Create a `.env` file in the project root:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   BACKEND_API_URL=http://localhost:5000
   ```

4. **Install Chrome WebDriver:**
   The system automatically downloads and manages Chrome WebDriver using `webdriver-manager`.

## ⚙️ Configuration

### User Configuration

The system creates a `user_config.json` file automatically on first run. Edit it with your details:

```json
{
  "users": [
    {
      "user_id": "your_user_id",
      "auth_token": "your_auth_token",
      "search_queries": [
        "python developer",
        "software engineer",
        "full stack developer"
      ],
      "profile": {
        "fullName": "Your Name",
        "email": "your.email@example.com",
        "location": "Remote",
        "skills": ["Python", "JavaScript", "React"],
        "experience": "3-5 years",
        "education": "Bachelor's Degree",
        "resume_headline": "Your Professional Title"
      }
    }
  ],
  "settings": {
    "max_jobs_per_day": 100,
    "max_applications_per_hour": 10,
    "min_match_score": 0.7,
    "headless_mode": true,
    "auto_start": true
  }
}
```

### System Configuration

Edit `config.py` to customize system behavior:

- **Application Limits**: Daily/hourly application caps
- **AI Model**: OpenAI model selection and parameters
- **Scraping Settings**: Delays, user agent rotation, headless mode
- **Matching Weights**: Skills, experience, location, salary importance

## 🚀 Usage

### Quick Start

1. **Run in demo mode first:**
   ```bash
   python main.py --mode demo
   ```

2. **Run with your configuration:**
   ```bash
   python main.py --mode multi --config user_config.json
   ```

### Operation Modes

- **`--mode demo`**: Test the system with sample data
- **`--mode single`**: Run for one user, one application cycle
- **`--mode multi`**: Run for multiple users with scheduler (default)

### Command Line Options

```bash
python main.py [OPTIONS]

Options:
  --config, -c    Path to user configuration file (default: user_config.json)
  --mode, -m      Operation mode: single, multi, or demo (default: multi)
  --verbose, -v   Enable verbose logging
```

## 🔧 How It Works

### 1. Profile Analysis
- Analyzes user profile using AI to extract skills, experience, preferences
- Creates a structured profile for job matching

### 2. Job Discovery
- Scrapes multiple job sources (Indeed, LinkedIn, RemoteOK)
- Removes duplicates and filters by relevance

### 3. AI Matching
- Calculates match scores between user profile and job postings
- Uses OpenAI GPT models for intelligent matching
- Considers skills, experience, location, salary, and preferences

### 4. Autonomous Applications
- Automatically fills application forms
- Generates personalized cover letters
- Submits applications with anti-detection measures
- Tracks all applications in local database

### 5. Scheduling
- Runs daily application cycles (9 AM, 2 PM, 6 PM)
- Hourly job discovery without applications
- Weekly profile optimization

## 📊 Monitoring and Statistics

### Application Tracking

The system tracks:
- Applications per day/hour
- Match scores for each application
- Response rates
- Application status and history

### Viewing Stats

```python
# Get stats for specific user
stats = scheduler.get_user_stats('user_id')

# Get stats for all users
all_stats = scheduler.get_all_stats()

# Get scheduler status
status = scheduler.get_scheduler_status()
```

## 🛡️ Safety Features

### Rate Limiting
- Maximum 100 applications per day
- Maximum 10 applications per hour
- Random delays between applications

### Anti-Detection
- User agent rotation
- Random delays and human-like behavior
- Headless mode option
- Advanced Chrome options

### Error Handling
- Graceful fallbacks when AI services fail
- Comprehensive logging
- Automatic retry mechanisms

## 🔍 Customization

### Adding Job Sources

Extend `job_scraper.py` to add new job sources:

```python
def scrape_new_source_jobs(self, search_query: str, limit: int = 50):
    # Implementation for new source
    pass
```

### Custom Matching Logic

Modify `profile_analyzer.py` to implement custom matching algorithms:

```python
def custom_match_score(self, profile: Dict, job: Dict) -> float:
    # Your custom matching logic
    return score
```

### Profile Optimization

Extend the weekly profile optimization in `scheduler.py`:

```python
def _optimize_user_profile(self, user_id: str, profile: Dict):
    # Analyze successful applications
    # Identify skill gaps
    # Suggest improvements
    pass
```

## 📝 Logging

The system provides comprehensive logging:

- **File logging**: `ai_agent.log`
- **Console output**: Real-time status updates
- **Verbose mode**: Detailed debugging information

## ⚠️ Important Notes

### Legal and Ethical Considerations

- **Respect Terms of Service**: Ensure compliance with job site terms
- **Rate Limiting**: Don't overwhelm job sites with requests
- **Data Privacy**: Handle user data responsibly
- **Anti-Spam**: Use the system responsibly to avoid being flagged

### Browser Requirements

- Chrome browser must be installed
- System automatically manages WebDriver
- Headless mode recommended for production

### API Limits

- OpenAI API usage depends on your plan
- Monitor API costs and usage
- Consider implementing caching for repeated queries

## 🐛 Troubleshooting

### Common Issues

1. **Chrome WebDriver errors:**
   - Ensure Chrome is installed and updated
   - Check system permissions

2. **OpenAI API errors:**
   - Verify API key is correct
   - Check API quota and billing

3. **Scraping failures:**
   - Job sites may change their structure
   - Update selectors in `job_scraper.py`

4. **Rate limiting:**
   - Reduce application frequency
   - Increase delays between requests

### Debug Mode

Run with verbose logging:
```bash
python main.py --verbose --mode demo
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is for educational and personal use. Please respect the terms of service of job sites and use responsibly.

## ⚡ Performance Tips

- Use headless mode for production
- Adjust delays based on your needs
- Monitor API usage and costs
- Regularly update job source selectors
- Use multiple search queries for better coverage

## 🔮 Future Enhancements

- **Resume Optimization**: AI-powered resume improvement suggestions
- **Interview Preparation**: Generate interview questions and answers
- **Salary Negotiation**: AI-powered salary negotiation strategies
- **Company Research**: Automated company research and insights
- **Application Tracking**: Integration with ATS systems
- **Mobile App**: Companion mobile application
- **Analytics Dashboard**: Web-based monitoring interface

---

**Disclaimer**: This tool is for educational purposes. Users are responsible for complying with job site terms of service and applicable laws. Use responsibly and ethically.
