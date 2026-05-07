import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import sequelize from './config/database';
import './models/index'; // Registrar modelos y asociaciones
import apiRouter from './routes/api.router';

const app = express();
const PORT = process.env.PORT ?? 3000;

// Middlewares
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (curl, Postman, widget IIFE en mismo dominio)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para el origen: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());

// Servir el widget compilado desde /widget.js
app.use('/widget.js', express.static(path.join(__dirname, '../../widget/dist/widget.js')));

// Rutas (todas gestionadas en api.router.ts)
app.use(apiRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Arranque del servidor
const initDb = async (): Promise<void> => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log('✅ Base de datos sincronizada');
};

// En Vercel (serverless) no se llama a app.listen() — Vercel usa el export default
// En local sí arrancamos el servidor HTTP completo
if (!process.env.VERCEL) {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('❌ Error al arrancar el servidor:', error);
      process.exit(1);
    });
} else {
  // En Vercel: sincronizar la BD en el cold start sin llamar a listen()
  initDb().catch((error) => {
    console.error('❌ Error al sincronizar la base de datos:', error);
  });
}

export default app;
