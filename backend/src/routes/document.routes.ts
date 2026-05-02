import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import * as documentController from '../controllers/document.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/:agentId', authenticate, documentController.getByAgent);
router.post('/upload', authenticate, upload.single('file'), documentController.upload);
router.delete('/:id', authenticate, documentController.deleteDocument);

export default router;
