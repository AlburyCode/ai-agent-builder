import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import sequelize from './config/database';
import './models/index'; // Registrar modelos y asociaciones
import apiRouter from './routes/api.router';

const app = express();
const PORT = process.env.PORT ?? 3000;

// Middlewares
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',').map(s => s.trim());
// /chat/* es consumido por el widget embebido en cualquier dominio → CORS abierto
// El resto de la API solo acepta orígenes de FRONTEND_URL
app.use((req, res, next) => {
  if (req.path.startsWith('/chat')) {
    return cors({ origin: '*' })(req, res, next);
  }
  return cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS bloqueado para el origen: ${origin}`));
    },
    credentials: true,
  })(req, res, next);
});
app.use(express.json());

// Rutas (todas gestionadas en api.router.ts)
app.use(apiRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Arranque del servidor
// En Vercel (serverless): no llamar a listen() ni a sync().
// Sequelize abre la conexión lazy en la primera query.
// En local: sync() crea/altera las tablas y arranca el servidor HTTP.
if (!process.env.VERCEL) {
  sequelize.authenticate()
    .then(() => sequelize.sync({ alter: true }))
    .then(() => {
      console.log('✅ Base de datos sincronizada');
      app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('❌ Error al arrancar el servidor:', error);
      process.exit(1);
    });
}

export default app;
