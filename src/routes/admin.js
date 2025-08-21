import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import {
  getSystemConfig,
  updateSystemConfig,
  getSystemStats,
  testEmailConfig,
  getSystemHealth
} from '../controllers/systemAdminController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(roleMiddleware(['admin']));

// System configuration routes
router.get('/config', getSystemConfig);
router.put('/config', updateSystemConfig);

// System statistics and monitoring
router.get('/stats', getSystemStats);
router.get('/health', getSystemHealth);

// Test functionality
router.post('/test-email', testEmailConfig);

export default router;
