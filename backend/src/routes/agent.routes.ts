import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as agentController from '../controllers/agent.controller';

const router = Router();

router.get('/', authenticate, agentController.getAll);
router.get('/:id', authenticate, agentController.getOne);
router.post('/', authenticate, agentController.create);
router.put('/:id', authenticate, agentController.update);
router.delete('/:id', authenticate, agentController.remove);

export default router;
