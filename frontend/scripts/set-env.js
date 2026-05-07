/**
 * Prebuild script: lee API_URL del entorno y genera environment.prod.ts
 * antes de que Angular compile en modo producción.
 *
 * Local:   API_URL no definida → usa 'http://localhost:3000' como fallback
 * Vercel:  establece API_URL=https://tu-backend.vercel.app en las variables
 *          de entorno del proyecto frontend en el dashboard de Vercel.
 */

const fs   = require('fs');
const path = require('path');

const apiUrl    = process.env.API_URL    || 'http://localhost:3000';
const widgetUrl = process.env.WIDGET_URL || 'http://localhost:5173';

const content = `// Este fichero se genera automáticamente antes del build mediante scripts/set-env.js
// No editar manualmente — los cambios se sobreescriben en cada npm run build
export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  widgetUrl: '${widgetUrl}'
};
`;

const targetPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(targetPath, content, 'utf8');
console.log('✅ environment.prod.ts generado con API_URL:', apiUrl, '| WIDGET_URL:', widgetUrl);
