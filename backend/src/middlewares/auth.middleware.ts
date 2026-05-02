import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Ampliación de tipos de Express para incluir req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Formato esperado: "Bearer <token>"

  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
      email: string;
      role: string;
    };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Middleware opcional: parsea el JWT si está presente pero no rechaza si falta.
 * útil para rutas públicas (widget) que también pueden llamarse desde el backoffice autenticado.
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
        userId: number;
        email: string;
        role: string;
      };
      req.user = payload;
    } catch {
      // Token inválido — se ignora, req.user queda undefined
    }
  }

  next();
};
