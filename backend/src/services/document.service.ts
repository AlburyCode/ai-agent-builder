import Document from '../models/Document';

export const getByAgent = async (agentId: number): Promise<Document[]> => {
  return await Document.findAll({ where: { agentId } });
};

export const createDocument = async (data: {
  agentId: number;
  fileName: string;
  fileType: string | null;
  openaiFileId: string;
}): Promise<Document> => {
  return await Document.create(data);
};

export const deleteDocument = async (id: number): Promise<void> => {
  const doc = await Document.findByPk(id);
  if (!doc) throw new Error('Documento no encontrado');
  await doc.destroy();
};

export const getDocumentById = async (id: number): Promise<Document> => {
  const doc = await Document.findByPk(id);
  if (!doc) throw new Error('Documento no encontrado');
  return doc;
};
