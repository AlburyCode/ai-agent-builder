import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AgentAttributes {
  id: number;
  name: string;
  description: string | null;
  instructions: string | null;
  openaiVectorStoreId: string | null;
  userId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AgentCreationAttributes extends Optional<AgentAttributes, 'id' | 'description' | 'instructions' | 'openaiVectorStoreId'> {}

class Agent extends Model<AgentAttributes, AgentCreationAttributes> implements AgentAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public instructions!: string | null;
  public openaiVectorStoreId!: string | null;
  public userId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Agent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    openaiVectorStoreId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'agents',
  }
);

export default Agent;
