import express from 'express';
import {
  createContactQuery,
  getAllQueries,
  getQueryById,
  updateQueryStatus,
  addQueryResponse,
  getQueryStats,
  deleteQuery,
  exportQueries
} from '../controllers/queryController.js';
import { protect as authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Public routes (no authentication required)
router.post('/contact', createContactQuery); // Contact form submission

// Protected routes (authentication required)
router.use(authMiddleware);

// Admin-only routes
router.get('/', roleMiddleware(['admin']), getAllQueries);
router.get('/stats', roleMiddleware(['admin']), getQueryStats);
router.get('/export', roleMiddleware(['admin']), exportQueries);
router.get('/:id', roleMiddleware(['admin']), getQueryById);
router.patch('/:id/status', roleMiddleware(['admin']), updateQueryStatus);
router.post('/:id/response', roleMiddleware(['admin']), addQueryResponse);
router.delete('/:id', roleMiddleware(['admin']), deleteQuery);

export default router;
