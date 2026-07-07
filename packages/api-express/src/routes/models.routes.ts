import { Router } from 'express';
import * as modelsController from '../controllers/models.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authMiddleware, modelsController.getModels);
router.post('/', authMiddleware, modelsController.addModel);
router.patch('/:modelId', authMiddleware, modelsController.updateModel);
router.delete('/:modelId', authMiddleware, modelsController.deleteModel);

export default router;