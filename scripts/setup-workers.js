// scripts/setup-workers.js
const fs = require('fs');
const path = require('path');

const WORKER_SOURCE = path.join(__dirname, '../utils/crypto.worker.thread.ts');
const WORKER_DEST = path.join(__dirname, '../crypto.worker.thread.js');

// Función para transpilar TypeScript a JavaScript
function transpileWorker() {
  try {
    // Leer el archivo TypeScript
    let content = fs.readFileSync(WORKER_SOURCE, 'utf8');
    
    // Remover imports de tipos y type annotations (simplificado)
    content = content
      .replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];?/g, '')
      .replace(/:\s*string|:\s*number|:\s*boolean|:\s*any|:\s*void/g, '')
      .replace(/:\s*Uint8Array/g, '')
      .replace(/\s*\|\s*null/g, '')
      .replace(/interface\s+\w+\s*{[^}]+}/g, '')
      .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
      .replace(/as\s+any/g, '')
      .replace(/export\s+/g, '');
    
    // Agregar imports necesarios al inicio
    const imports = `
const { self } = require('react-native-threads');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');
`;
    
    content = imports + content;
    
    // Escribir el archivo JavaScript
    fs.writeFileSync(WORKER_DEST, content);
    
      } catch (error) {
    console.error('❌ Error transpilando worker:', error);
    process.exit(1);
  }
}

// Ejecutar
transpileWorker();

// Watch mode si se pasa --watch
if (process.argv.includes('--watch')) {
    
  fs.watchFile(WORKER_SOURCE, (curr, prev) => {
        transpileWorker();
  });
}