import { Request, Response } from 'express';
import * as conversationService from '../services/conversation.service';

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
