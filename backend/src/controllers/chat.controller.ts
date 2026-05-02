import { Request, Response } from 'express';
import * as conversationService from '../services/conversation.service';
import * as openaiService from '../services/openai.service';
import Agent from '../models/Agent';

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const { agentId, message, conversationId } = req.body;

  if (!agentId || !message) {
    res.status(400).json({ error: 'agentId y message son obligatorios' });
    return;
  }

  try {
    const agent = await Agent.findByPk(+agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agente no encontrado' });
      return;
    }

    const conversation = await conversationService.getOrCreateConversation(
      conversationId ? +conversationId : undefined,
      +agentId,
      req.user?.userId
    );

    const reply = await openaiService.chat(
      +agentId,
      message,
      conversation.messages,
      agent.instructions ?? ''
    );

    await conversationService.addMessage(conversation.id, 'user', message);
    await conversationService.addMessage(conversation.id, 'assistant', reply);

    res.json({ reply, conversationId: conversation.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    res.status(500).json({ error: message });
  }
};
