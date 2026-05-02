import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { optionalAuthenticate } from '../middlewares/auth.middleware';

const router = Router();

// Ruta pública con auth opcional: el widget la usa sin token, el backoffice la usa con token
router.post('/message', optionalAuthenticate, chatController.sendMessage);

export default router;
