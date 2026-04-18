import { Router } from 'express';
import * as archiveController from '../controllers/archive.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.get('/conversations', authMiddleware, archiveController.getConversations);
router.get('/conversations/:id', authMiddleware, archiveController.getConversation);
router.get('/count', authMiddleware, archiveController.getCount);

export default router;