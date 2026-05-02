import User from './User';
import Agent from './Agent';
import Document from './Document';
import Conversation from './Conversation';

// User — Agent
User.hasMany(Agent, { foreignKey: 'userId', onDelete: 'CASCADE' });
Agent.belongsTo(User, { foreignKey: 'userId' });

// Agent — Document
Agent.hasMany(Document, { foreignKey: 'agentId', onDelete: 'CASCADE' });
Document.belongsTo(Agent, { foreignKey: 'agentId' });

// Agent — Conversation
Agent.hasMany(Conversation, { foreignKey: 'agentId', onDelete: 'CASCADE' });
Conversation.belongsTo(Agent, { foreignKey: 'agentId' });

export { User, Agent, Document, Conversation };
