import OpenAI, { toFile } from 'openai';
import Agent from '../models/Agent';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const uploadFileToOpenAI = async (
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> => {
  try {
    const file = await toFile(buffer, fileName, { type: mimeType });
    const uploaded = await openai.files.create({ file, purpose: 'assistants' });
    return uploaded.id;
  } catch (error) {
    throw new Error(`Error al subir archivo a OpenAI: ${(error as Error).message}`);
  }
};

export const addFileToVectorStore = async (
  agentId: number,
  openaiFileId: string
): Promise<void> => {
  try {
    const agent = await Agent.findByPk(agentId);
    if (!agent) throw new Error(`Agente ${agentId} no encontrado`);

    let vsId = agent.openaiVectorStoreId;

    if (!vsId) {
      const vectorStore = await openai.vectorStores.create({
        name: `agent-${agentId}-vs`,
      });
      vsId = vectorStore.id;
      await agent.update({ openaiVectorStoreId: vsId });
    }

    await openai.vectorStores.files.create(vsId, { file_id: openaiFileId });
  } catch (error) {
    throw new Error(`Error al añadir archivo al vector store: ${(error as Error).message}`);
  }
};

export const removeFileFromVectorStore = async (
  _agentId: number,
  openaiFileId: string
): Promise<void> => {
  try {
    await openai.files.delete(openaiFileId);
  } catch {
    // El archivo ya no existe en OpenAI; se ignora silenciosamente
  }
};

export const chat = async (
  agentId: number,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> => {
  try {
    const agent = await Agent.findByPk(agentId);
    if (!agent) throw new Error(`Agente ${agentId} no encontrado`);

    const input = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ] as OpenAI.Responses.ResponseInput;

    const tools: OpenAI.Responses.Tool[] = agent.openaiVectorStoreId
      ? [{ type: 'file_search', vector_store_ids: [agent.openaiVectorStoreId] }]
      : [];

    const response = await openai.responses.create({
      model: 'gpt-4o',
      instructions: systemPrompt,
      input,
      ...(tools.length > 0 && { tools }),
    });

    return response.output_text;
  } catch (error) {
    throw new Error(`Error en el chat con OpenAI: ${(error as Error).message}`);
  }
};
