export interface User {
  id: number;
  email: string;
  role: string;
}

export interface Agent {
  id: number;
  name: string;
  description: string;
  instructions: string;
  openaiVectorStoreId?: string;
  userId: number;
  createdAt: string;
}

export interface Document {
  id: number;
  agentId: number;
  fileName: string;
  fileType: string;
  openaiFileId: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: number;
  agentId: number;
  userId: number | null;
  messages: ChatMessage[];
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
