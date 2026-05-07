import { Request, Response } from 'express';
import * as conversationService from '../services/conversation.service';

export const getAllByAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = +req.params.agentId;
    const userId = req.user!.userId;
    const conversations = await conversationService.getAllConversationsByAgent(agentId, userId);
    res.json(conversations);
  } catch (error) {
    if (error instanceof Error && error.message === 'Agente no encontrado o no autorizado') {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al obtener las conversaciones' });
    }
  }
};

export const getByAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = +req.params.agentId;
    const userId = req.user!.userId;
    const conversations = await conversationService.getConversationsByAgentAndUser(agentId, userId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las conversaciones' });
  }
};
