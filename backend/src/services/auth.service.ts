import jwt from 'jsonwebtoken';
import User from '../models/User';

interface AuthResult {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

export const register = async (email: string, password: string): Promise<AuthResult> => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new Error('Email ya registrado');
  }

  const user = await User.create({ email, password });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  return { token, user: { id: user.id, email: user.email, role: user.role } };
};

export const login = async (email: string, password: string): Promise<AuthResult> => {
  const user = await User.findOne({ where: { email } });

  // Mismo mensaje para usuario no encontrado y contraseña incorrecta
  // para no revelar si el email existe en el sistema
  const INVALID_CREDENTIALS = 'Credenciales inválidas';

  if (!user) {
    throw new Error(INVALID_CREDENTIALS);
  }

  const bcryptjs = await import('bcryptjs');
  const isValid = await bcryptjs.compare(password, user.password);

  if (!isValid) {
    throw new Error(INVALID_CREDENTIALS);
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  return { token, user: { id: user.id, email: user.email, role: user.role } };
};
