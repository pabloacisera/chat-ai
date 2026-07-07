import { Router } from 'express';
import * as anonController from '../controllers/anon.controller.js';

const router = Router();

router.post('/session', anonController.createSession);
router.get('/conversations/:sessionId', anonController.getConversations);
router.post('/conversations/:sessionId', anonController.createConversation);
router.put('/conversations/:sessionId/:convId', anonController.updateConversation);
router.delete('/conversations/:sessionId/:convId', anonController.deleteConversation);
router.get('/conversations/:sessionId/:convId/messages', anonController.getMessages);
router.post('/messages', anonController.sendMessage);
router.patch('/config/:sessionId', anonController.updateConfig);
router.get('/welcome/:sessionId', anonController.getWelcomeShown);
router.post('/welcome/:sessionId', anonController.setWelcomeShown);

export default router;