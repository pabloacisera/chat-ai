import { Router } from 'express';
import * as syncController from '../controllers/sync.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.post('/migrate', authMiddleware, syncController.migrate);

export default router;