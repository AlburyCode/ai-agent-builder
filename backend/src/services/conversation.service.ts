import { Op } from 'sequelize';
import Conversation from '../models/Conversation';

export const getConversationsByAgentAndUser = async (
  agentId: number,
  userId: number
): Promise<Conversation[]> => {
  return await Conversation.findAll({
    where: { agentId, userId },
    order: [['createdAt', 'ASC']],
  });
};

export const getOrCreateConversation = async (
  conversationId: number | undefined,
  agentId: number,
  userId?: number
): Promise<Conversation> => {
  if (conversationId) {
    const existing = await Conversation.findOne({
      where: { id: conversationId, agentId },
    });
    if (existing) return existing;
  }
  return await Conversation.create({ agentId, userId: userId ?? null, messages: [] });
};

export const addMessage = async (
  conversationId: number,
  role: 'user' | 'assistant',
  content: string
): Promise<Conversation> => {
  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) throw new Error('Conversación no encontrada');

  const updatedMessages = [
    ...conversation.messages,
    { role, content },
  ];
  return await conversation.update({ messages: updatedMessages });
};
