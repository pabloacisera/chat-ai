import { Router } from 'express';
import * as conversationsController from '../controllers/conversations.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authMiddleware, conversationsController.getConversations);
router.get('/count', authMiddleware, conversationsController.getConversationCount);
router.get('/:id/messages', authMiddleware, conversationsController.getConversationMessages);
router.post('/', authMiddleware, conversationsController.createConversation);
router.patch('/:id', authMiddleware, conversationsController.updateConversation);
router.delete('/:id', authMiddleware, conversationsController.deleteConversation);
router.post('/delete/bulk', authMiddleware, conversationsController.deleteBulk);
router.post('/archive', authMiddleware, conversationsController.archiveBulk);
router.post('/archive/all', authMiddleware, conversationsController.archiveAll);

export default router;