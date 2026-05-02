import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller';

const router = Router();

// GET /conversations/agent/:agentId — conversaciones del usuario autenticado para ese agente
router.get('/agent/:agentId', conversationController.getByAgent);

export default router;
