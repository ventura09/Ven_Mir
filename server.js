'use strict';
// Servidor HTTP sin dependencias externas. Generado por el sistema multi-agente.
// Feature global: ven-mir
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const RESOURCES = [require('./src/resources/tasks'), require('./src/resources/users')];
const byName = new Map(RESOURCES.map((r) => [r.name, r]));

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

function json(res, status, body) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
}

/**
 * Sirve un archivo de public/.
 * La ruta se DEScodifica antes de resolverla y despues se comprueba que el
 * resultado sigue dentro de public/: sin esa comprobacion, un "../" codificado
 * permitiria leer cualquier archivo del proyecto.
 */
async function serveStatic(urlPath, res) {
  if (!fs.existsSync(PUBLIC_DIR)) {
    return json(res, 404, { error: 'no hay interfaz web en este proyecto' });
  }

  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return json(res, 400, { error: 'ruta mal formada' });
  }

  const relative = decoded === '/' || decoded === '' ? 'index.html' : decoded.replace(/^\/+/, '');
  const target = path.resolve(PUBLIC_DIR, relative);

  if (target !== PUBLIC_DIR && !target.startsWith(PUBLIC_DIR + path.sep)) {
    return json(res, 403, { error: 'forbidden' });
  }

  try {
    const stats = await fs.promises.stat(target);
    if (!stats.isFile()) return json(res, 404, { error: 'not found' });
    const body = await fs.promises.readFile(target);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch {
    return json(res, 404, { error: 'not found' });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    // Un cuerpo malformado es un error del cliente (400), no del servidor (500).
    const rejectWithStatus = (message, status) => {
      const err = new Error(message);
      err.status = status;
      reject(err);
    };
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) rejectWithStatus('payload too large', 413);
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { rejectWithStatus('invalid json', 400); }
    });
    req.on('error', (err) => rejectWithStatus(`error de lectura: ${err.message}`, 400));
  });
}

// El manejador es asincrono porque el almacenamiento tambien lo es: node:sqlite
// responde al instante, PostgreSQL habla por red. Todos los accesos usan await.
async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (url.pathname === '/health') {
    return json(res, 200, { status: 'ok', feature: 'ven-mir', resources: [...byName.keys()] });
  }

  if (parts[0] === 'api' && parts[1]) {
    const resource = byName.get(parts[1]);
    if (!resource) return json(res, 404, { error: 'unknown resource' });
    const id = parts[2];
    try {
      if (req.method === 'GET' && !id) return json(res, 200, { data: await resource.list() });
      if (req.method === 'POST' && !id) return json(res, 201, await resource.create(await readBody(req)));
      if (req.method === 'GET' && id) {
        const item = await resource.get(id);
        return item ? json(res, 200, item) : json(res, 404, { error: 'not found' });
      }
      if (req.method === 'DELETE' && id) {
        return (await resource.remove(id))
          ? json(res, 204, undefined)
          : json(res, 404, { error: 'not found' });
      }
      return json(res, 405, { error: 'method not allowed' });
    } catch (err) {
      return json(res, err.status || 500, { error: err.message });
    }
  }

  // Todo lo que no es la API se sirve desde public/.
  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(url.pathname, res);
  }

  return json(res, 404, { error: 'route not found' });
}

function createServer() {
  return http.createServer(handler);
}

/** Cierra los almacenes abiertos. Imprescindible para liberar archivos y pools. */
async function closeStores() {
  let closed = 0;
  for (const resource of RESOURCES) {
    if (typeof resource.close === 'function') {
      await resource.close();
      closed += 1;
    }
  }
  return closed;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    process.stdout.write(`listening on ${port}\n`);
    for (const resource of RESOURCES) {
      if (typeof resource.storage === 'function') {
        const info = resource.storage();
        process.stdout.write(`  ${info.table}: driver=${info.driver} destino=${info.location}\n`);
      }
    }
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      await closeStores();
      process.exit(0);
    });
  }
}

module.exports = { createServer, handler, RESOURCES, closeStores };
