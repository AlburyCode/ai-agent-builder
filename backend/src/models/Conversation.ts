import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationAttributes {
  id: number;
  agentId: number;
  userId: number | null;
  messages: Message[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface ConversationCreationAttributes extends Optional<ConversationAttributes, 'id' | 'userId' | 'messages'> {}

class Conversation extends Model<ConversationAttributes, ConversationCreationAttributes> implements ConversationAttributes {
  public id!: number;
  public agentId!: number;
  public userId!: number | null;
  public messages!: Message[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Conversation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    agentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'agents',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    messages: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: 'conversations',
  }
);

export default Conversation;
