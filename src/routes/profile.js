import express from 'express';
import {
  getMyProfile,
  updateBasicInfo,
  addExperience,
  deleteExperience,
  addEducation,
  deleteEducation,
  updateSkills,
  updateJobPreferences,
  uploadProfilePicture,
  uploadResume,
  applyToJob,
  toggleSaveJob,
  getSavedJobs,
  getApplicationHistory,
  getProfileById,
  searchProfiles
} from '../controllers/profileController.js';
import { protect as authMiddleware } from '../middlewares/authMiddleware.js';

console.log('🚀 Profile routes loaded successfully');
import { roleMiddleware } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Public routes
router.get('/search', searchProfiles); // Search profiles (for recruiters)
router.get('/:userId', getProfileById); // View public profile

// Protected routes (authentication required)
router.use(authMiddleware);

// Profile management
router.get('/', getMyProfile); // Get current user's profile
router.patch('/basic', updateBasicInfo); // Update basic info
router.patch('/skills', updateSkills); // Update skills
router.patch('/preferences', updateJobPreferences); // Update job preferences

// Experience management
router.post('/experience', addExperience); // Add experience
router.patch('/experience/:id', addExperience); // Update experience
router.delete('/experience/:id', deleteExperience); // Delete experience

// Education management
router.post('/education', addEducation); // Add education
router.patch('/education/:id', addEducation); // Update education
router.delete('/education/:id', deleteEducation); // Delete education

// File uploads
router.post('/upload/picture', uploadProfilePicture); // Upload profile picture
router.post('/upload/resume', uploadResume); // Upload resume

// Job-related actions
router.post('/apply/:jobId', applyToJob); // Apply to job
router.post('/save/:jobId', toggleSaveJob); // Save/unsave job
router.get('/saved/jobs', getSavedJobs); // Get saved jobs
router.get('/applications/history', getApplicationHistory); // Get application history

export default router;
