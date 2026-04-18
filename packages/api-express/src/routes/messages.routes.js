import { Router } from 'express';
import * as messagesController from '../controllers/messages.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authMiddleware, messagesController.sendMessage);

export default router;