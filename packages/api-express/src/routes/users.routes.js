import { Router } from 'express';
import * as usersController from '../controllers/users.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.get('/me', authMiddleware, usersController.getMe);
router.get('/config', authMiddleware, usersController.getConfig);
router.patch('/config', authMiddleware, usersController.updateConfig);

export default router;