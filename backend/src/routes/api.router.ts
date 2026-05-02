import { Router } from 'express';
import authRoutes from './auth.routes';
import agentRoutes from './agent.routes';
import documentRoutes from './document.routes';
import chatRoutes from './chat.routes';
import conversationRoutes from './conversation.routes';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Rutas públicas — sin middleware de autenticación
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);

// Rutas protegidas
router.use('/agents', authenticate, agentRoutes);
router.use('/documents', documentRoutes);
router.use('/conversations', authenticate, conversationRoutes);

export default router;
