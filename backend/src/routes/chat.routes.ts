import { Router } from 'express';
import cors from 'cors';
import * as chatController from '../controllers/chat.controller';
import { optionalAuthenticate } from '../middlewares/auth.middleware';

const router = Router();

// CORS abierto para /chat/message: el widget puede estar embebido en cualquier dominio.
// El resto de la API usa el CORS restrictivo global (solo FRONTEND_URL).
const openCors = cors({ origin: '*' });

// Ruta pública con auth opcional: el widget la usa sin token, el backoffice la usa con token
router.post('/message', openCors, optionalAuthenticate, chatController.sendMessage);

export default router;
