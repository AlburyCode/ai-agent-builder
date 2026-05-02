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
app.use(cors());
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
const start = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('✅ Base de datos sincronizada');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al arrancar el servidor:', error);
    process.exit(1);
  }
};

start();

export default app;
