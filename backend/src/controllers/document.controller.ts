import { Request, Response } from 'express';
import * as documentService from '../services/document.service';
import * as openaiService from '../services/openai.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const upload = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No se recibió ningún archivo' });
    return;
  }

  const { agentId } = req.body;
  if (!agentId) {
    res.status(400).json({ error: 'agentId es obligatorio' });
    return;
  }

  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    res.status(400).json({ error: 'Tipo de archivo no permitido. Solo pdf, doc, docx, txt.' });
    return;
  }

  const parsedAgentId = parseInt(agentId, 10);
  let openaiFileId: string | null = null;

  try {
    // 1. Subir el archivo a OpenAI Files
    openaiFileId = await openaiService.uploadFileToOpenAI(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // 2. Añadir al vector store del agente
    try {
      await openaiService.addFileToVectorStore(parsedAgentId, openaiFileId);
    } catch {
      // Limpieza: borrar el archivo de OpenAI si el vector store falló
      await openaiService.removeFileFromVectorStore(parsedAgentId, openaiFileId);
      res.status(502).json({ error: 'Error al añadir el archivo al vector store de OpenAI' });
      return;
    }

    // 3. Guardar en BD solo si OpenAI tuvo éxito
    const document = await documentService.createDocument({
      agentId: parsedAgentId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      openaiFileId,
    });

    res.status(201).json(document);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    res.status(500).json({ error: message });
  }
};

export const getByAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const documents = await documentService.getByAgent(+req.params.agentId);
    res.json(documents);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    res.status(500).json({ error: message });
  }
};

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await documentService.getDocumentById(+req.params.id);

    await openaiService.removeFileFromVectorStore(doc.agentId, doc.openaiFileId);

    await documentService.deleteDocument(+req.params.id);

    res.status(204).send();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    if (message === 'Documento no encontrado') {
      res.status(404).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
};
