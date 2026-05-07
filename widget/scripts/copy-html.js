/**
 * Post-build script: copia index.html a dist/ y ajusta la ruta del script
 * de /src/widget.js (dev server) a /widget.js (producción).
 */
const fs   = require('fs');
const path = require('path');

const src  = path.join(__dirname, '..', 'index.html');
const dest = path.join(__dirname, '..', 'dist', 'index.html');

let html = fs.readFileSync(src, 'utf8');

// En dev: type="module" src="/src/widget.js"
// En prod: sin type="module" (el IIFE no es un módulo ES), src="/widget.js"
html = html.replace('type="module"\n    src="/src/widget.js"', 'src="/widget.js"');
// Fallback por si el formato varía (todo en una línea)
html = html.replace('type="module" src="/src/widget.js"', 'src="/widget.js"');
// Por si no tiene type="module" aún
html = html.replace('src="/src/widget.js"', 'src="/widget.js"');

fs.writeFileSync(dest, html, 'utf8');
console.log('✅ dist/index.html generado para producción');
