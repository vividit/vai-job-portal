import openai
import json
import logging
from typing import Dict, List, Tuple
from config import Config

class ProfileAnalyzer:
    def __init__(self):
        self.config = Config()
        self.client = openai.OpenAI(api_key=self.config.OPENAI_API_KEY)
        self.logger = logging.getLogger(__name__)
        
    def analyze_user_profile(self, profile_data: Dict) -> Dict:
        """Analyze user profile and extract key insights for job matching"""
        try:
            prompt = self._create_profile_analysis_prompt(profile_data)
            
            response = self.client.chat.completions.create(
                model=self.config.AI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert job matching AI. Analyze the user profile and extract key information for job matching."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.config.MAX_TOKENS,
                temperature=self.config.TEMPERATURE
            )
            
            analysis = json.loads(response.choices[0].message.content)
            return analysis
            
        except Exception as e:
            self.logger.error(f"Error analyzing profile: {e}")
            return self._fallback_profile_analysis(profile_data)
    
    def calculate_job_match_score(self, user_profile: Dict, job: Dict) -> float:
        """Calculate how well a job matches the user's profile"""
        try:
            prompt = self._create_job_matching_prompt(user_profile, job)
            
            response = self.client.chat.completions.create(
                model=self.config.AI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert job matching AI. Rate how well a job matches a user profile from 0.0 to 1.0."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=self.config.TEMPERATURE
            )
            
            # Extract score from response
            score_text = response.choices[0].message.content.strip()
            try:
                score = float(score_text)
                return max(0.0, min(1.0, score))  # Clamp between 0 and 1
            except ValueError:
                # Fallback to basic scoring
                return self._fallback_job_matching(user_profile, job)
                
        except Exception as e:
            self.logger.error(f"Error calculating match score: {e}")
            return self._fallback_job_matching(user_profile, job)
    
    def generate_custom_cover_letter(self, user_profile: Dict, job: Dict) -> str:
        """Generate a personalized cover letter for a specific job"""
        try:
            prompt = self._create_cover_letter_prompt(user_profile, job)
            
            response = self.client.chat.completions.create(
                model=self.config.AI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert cover letter writer. Create a compelling, personalized cover letter."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            self.logger.error(f"Error generating cover letter: {e}")
            return self._fallback_cover_letter(user_profile, job)
    
    def _create_profile_analysis_prompt(self, profile: Dict) -> str:
        """Create prompt for AI profile analysis"""
        return f"""
        Analyze this user profile and return a JSON with the following structure:
        {{
            "skills": ["skill1", "skill2"],
            "experience_level": "entry|mid|senior|expert",
            "preferred_roles": ["role1", "role2"],
            "location_preferences": ["location1", "location2"],
            "salary_range": {{"min": 50000, "max": 150000}},
            "remote_preference": true/false,
            "industry_preferences": ["industry1", "industry2"],
            "key_achievements": ["achievement1", "achievement2"],
            "education_level": "bachelor|master|phd|other"
        }}
        
        Profile data: {json.dumps(profile, indent=2)}
        """
    
    def _create_job_matching_prompt(self, user_profile: Dict, job: Dict) -> str:
        """Create prompt for job matching"""
        return f"""
        Rate how well this job matches the user profile from 0.0 to 1.0.
        
        User Profile: {json.dumps(user_profile, indent=2)}
        Job: {json.dumps(job, indent=2)}
        
        Consider:
        - Skills match
        - Experience level
        - Location preference
        - Salary expectations
        - Industry alignment
        
        Return only the score as a number (e.g., 0.85)
        """
    
    def _create_cover_letter_prompt(self, user_profile: Dict, job: Dict) -> str:
        """Create prompt for cover letter generation"""
        return f"""
        Create a compelling cover letter for this job application.
        
        User Profile: {json.dumps(user_profile, indent=2)}
        Job: {json.dumps(job, indent=2)}
        
        Make it:
        - Personalized to the specific job
        - Highlight relevant skills and experience
        - Professional but engaging
        - Around 200-300 words
        - Include specific examples from the user's background
        """
    
    def _fallback_profile_analysis(self, profile_data: Dict) -> Dict:
        """Fallback profile analysis when AI fails"""
        skills = profile_data.get('skills', [])
        experience = profile_data.get('experience', 'mid')
        location = profile_data.get('location', 'Mumbai')
        
        return {
            "skills": skills[:5] if skills else ["Python", "JavaScript", "React"],
            "experience_level": experience,
            "preferred_roles": ["Software Developer", "Full Stack Developer"],
            "location_preferences": [location, "Remote"],
            "salary_range": {"min": 500000, "max": 1500000},  # Indian salaries in INR
            "remote_preference": True,
            "industry_preferences": ["Technology", "IT Services"],
            "key_achievements": ["Built scalable web applications", "Led development teams"],
            "education_level": "bachelor"
        }
    
    def _fallback_job_matching(self, user_profile: Dict, job: Dict) -> float:
        """Fallback job matching when AI fails"""
        # Basic scoring based on skills overlap
        user_skills = set(user_profile.get('skills', []))
        job_requirements = set(job.get('requirements', []))
        
        if not user_skills or not job_requirements:
            return 0.5
        
        overlap = len(user_skills.intersection(job_requirements))
        total = len(user_skills.union(job_requirements))
        
        return overlap / total if total > 0 else 0.5
    
    def _fallback_cover_letter(self, user_profile: Dict, job: Dict) -> str:
        """Fallback cover letter when AI fails"""
        name = user_profile.get('name', 'Professional')
        skills = ', '.join(user_profile.get('skills', [])[:3])
        
        return f"""
        Dear Hiring Manager,

        I am writing to express my interest in the {job.get('title', 'Software Developer')} position at {job.get('company', 'your company')}.

        With expertise in {skills}, I believe I would be a valuable addition to your team. My experience includes developing scalable applications and collaborating with cross-functional teams to deliver high-quality solutions.

        I am particularly excited about the opportunity to contribute to {job.get('company', 'your company')} and would welcome the chance to discuss how my skills and experience align with your needs.

        Thank you for considering my application. I look forward to hearing from you.

        Best regards,
        {name}
        """
