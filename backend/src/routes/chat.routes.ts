import { Router } from 'express';
import cors from 'cors';
import * as chatController from '../controllers/chat.controller';
import { optionalAuthenticate } from '../middlewares/auth.middleware';

const router = Router();

// CORS abierto para /chat/message: el widget puede estar embebido en cualquier dominio.
// Se registra también router.options para responder al preflight OPTIONS antes de que
// el CORS global de index.ts lo bloquee por origen desconocido.
const openCors = cors({ origin: '*' });

router.options('/message', openCors);
// Ruta pública con auth opcional: el widget la usa sin token, el backoffice la usa con token
router.post('/message', openCors, optionalAuthenticate, chatController.sendMessage);

export default router;
