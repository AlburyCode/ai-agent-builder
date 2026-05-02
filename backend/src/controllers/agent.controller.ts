import { Request, Response } from 'express';
import * as agentService from '../services/agent.service';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const agents = await agentService.getAgentsByUser(req.user!.userId);
    res.status(200).json(agents);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener agentes';
    res.status(500).json({ error: message });
  }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const agent = await agentService.getAgentById(+req.params.id, req.user!.userId);
    res.status(200).json(agent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener el agente';
    const status = message === 'No encontrado' ? 404 : 500;
    res.status(status).json({ error: message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const { name, description, instructions } = req.body;

  if (!name) {
    res.status(400).json({ error: 'El nombre es obligatorio' });
    return;
  }

  try {
    const agent = await agentService.createAgent({ name, description, instructions }, req.user!.userId);
    res.status(201).json(agent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al crear el agente';
    res.status(500).json({ error: message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const { name, description, instructions } = req.body;

  try {
    const agent = await agentService.updateAgent(+req.params.id, { name, description, instructions }, req.user!.userId);
    res.status(200).json(agent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al actualizar el agente';
    const status = message === 'No encontrado' ? 404 : 500;
    res.status(status).json({ error: message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await agentService.deleteAgent(+req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al eliminar el agente';
    const status = message === 'No encontrado' ? 404 : 500;
    res.status(status).json({ error: message });
  }
};
