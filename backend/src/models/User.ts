import { DataTypes, Model, Optional } from 'sequelize';
import bcryptjs from 'bcryptjs';
import sequelize from '../config/database';

interface UserAttributes {
  id: number;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public role!: 'admin' | 'user';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'admin',
    },
  },
  {
    sequelize,
    tableName: 'users',
    hooks: {
      // IMPORTANTE: usar beforeValidate (NO beforeCreate) para que el hash
      // esté calculado antes de que Sequelize valide allowNull: false en password
      beforeValidate: async (user: User) => {
        if (user.changed('password') && user.password && !user.password.startsWith('$2')) {
          const salt = await bcryptjs.genSalt(10);
          user.password = await bcryptjs.hash(user.password, salt);
        }
      },
    },
  }
);

export default User;
