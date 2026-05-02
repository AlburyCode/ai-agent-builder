import { Agent } from '../models/index';

export const getAgentsByUser = async (userId: number): Promise<Agent[]> => {
  return await Agent.findAll({ where: { userId } });
};

export const getAgentById = async (agentId: number, userId: number): Promise<Agent> => {
  const agent = await Agent.findOne({ where: { id: agentId, userId } });
  if (!agent) {
    throw new Error('No encontrado');
  }
  return agent;
};

export const createAgent = async (
  data: { name: string; description?: string; instructions?: string },
  userId: number
): Promise<Agent> => {
  return await Agent.create({ ...data, userId });
};

export const updateAgent = async (
  agentId: number,
  data: Partial<{ name: string; description: string; instructions: string }>,
  userId: number
): Promise<Agent> => {
  const agent = await Agent.findOne({ where: { id: agentId, userId } });
  if (!agent) {
    throw new Error('No encontrado');
  }
  return await agent.update(data);
};

export const deleteAgent = async (agentId: number, userId: number): Promise<void> => {
  const agent = await Agent.findOne({ where: { id: agentId, userId } });
  if (!agent) {
    throw new Error('No encontrado');
  }
  await agent.destroy();
};
