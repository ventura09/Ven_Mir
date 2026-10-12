'use strict';
// Pruebas reales del recurso "users" con node:test (nativo, sin dependencias).
// Generado por el sistema multi-agente.
//
// Levantan el servidor de verdad, hacen peticiones HTTP reales y comprueban la
// PERSISTENCIA. La misma suite sirve para los tres motores:
//
//   node --test tests/                                   -> sqlite (por defecto)
//   STORAGE_DRIVER=memory node --test tests/             -> memoria
//   STORAGE_DRIVER=postgres DATABASE_URL=... node --test tests/  -> PostgreSQL
const path = require('node:path');
const fs = require('node:fs');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

// El motor se decide por entorno, pero debe fijarse ANTES de cargar el servidor:
// los modulos de recurso resuelven su driver al cargarse.
const DRIVER = process.env.STORAGE_DRIVER || 'sqlite';
const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, '..', 'logs', 'test-users.db');

if (DRIVER === 'sqlite') {
  fs.rmSync(DB_FILE, { force: true });
  process.env.DATABASE_FILE = DB_FILE;
}
process.env.STORAGE_DRIVER = DRIVER;

const { createServer, closeStores } = require('../server.js');
const resource = require('../src/resources/users.js');
const { createStore } = require('../src/storage/index.js');

function hasPackage(name) {
  try {
    require.resolve(name);
    return true;
  } catch {
    return false;
  }
}

const onlySqlite = DRIVER === 'sqlite' ? false : 'solo aplica al driver sqlite';
const onlyPostgres = DRIVER === 'postgres'
  ? (hasPackage('pg') ? false : "falta el paquete 'pg': ejecuta npm install pg")
  : 'solo aplica al driver postgres';

/**
 * Destino del almacenamiento para abrir una SEGUNDA conexion. Cada motor se
 * identifica de forma distinta: SQLite con una ruta de archivo y PostgreSQL con
 * una cadena de conexion. Confundirlos hace que la segunda conexion apunte a
 * ningun sitio.
 */
function storeTarget() {
  if (DRIVER === 'sqlite') return { driver: DRIVER, file: DB_FILE };
  if (DRIVER === 'postgres') return { driver: DRIVER, file: process.env.DATABASE_URL };
  return { driver: DRIVER };
}

after(async () => {
  await closeStores();
  if (DRIVER === 'sqlite') fs.rmSync(DB_FILE, { force: true });
});

async function withServer(fn) {
  await resource.reset();
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function post(base, body) {
  return fetch(`${base}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('users: usa el driver configurado', () => {
  const info = resource.storage();
  assert.equal(info.driver, DRIVER, `el recurso debe usar el driver "${DRIVER}"`);
  assert.ok(info.location, 'el almacenamiento debe informar de su destino');
  if (DRIVER === 'sqlite') {
    assert.equal(info.location, DB_FILE, 'debe usar el archivo configurado');
  }
});

test('users: GET /health responde ok', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });
});

test('users: POST crea y GET recupera el item', async () => {
  await withServer(async (base) => {
    const created = await post(base, { name: 'demo' });
    assert.equal(created.status, 201);
    const item = await created.json();
    assert.ok(item.id, 'debe devolver un id');
    assert.equal(item.name, 'demo');

    const got = await fetch(`${base}/api/users/${item.id}`);
    assert.equal(got.status, 200);
    assert.equal((await got.json()).name, 'demo');
  });
});

test('users: GET lista devuelve los items creados', async () => {
  await withServer(async (base) => {
    await post(base, { name: 'uno' });
    const res = await fetch(`${base}/api/users`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).data.length, 1);
  });
});

test('users: DELETE elimina el item', async () => {
  await withServer(async (base) => {
    const created = await (await post(base, { name: 'borrame' })).json();
    const removed = await fetch(`${base}/api/users/${created.id}`, { method: 'DELETE' });
    assert.equal(removed.status, 204);
    const gone = await fetch(`${base}/api/users/${created.id}`);
    assert.equal(gone.status, 404);
  });
});

test('users: POST sin name devuelve 400', async () => {
  await withServer(async (base) => {
    assert.equal((await post(base, {})).status, 400);
  });
});

test('users: POST con JSON invalido devuelve 400', async () => {
  await withServer(async (base) => {
    assert.equal((await post(base, '{no-es-json')).status, 400);
  });
});

test('users: GET con id inexistente devuelve 404 (no 500)', async () => {
  await withServer(async (base) => {
    // 'no-existe' no es un UUID valido: el driver debe tratarlo como inexistente,
    // no dejar que el motor de base de datos lance un error de tipo.
    assert.equal((await fetch(`${base}/api/users/no-existe`)).status, 404);
  });
});

// --- Persistencia real ---------------------------------------------------
// Se comprueba igual en los tres motores: el dato lo lee una conexion nueva.

test('users: el dato lo ve una conexion nueva e independiente', async () => {
  await withServer(async (base) => {
    const res = await post(base, { name: 'persistente' });
    assert.equal(res.status, 201);
  });

  const otra = createStore({ table: 'users', ...storeTarget() });
  const items = await otra.list();
  await otra.close();

  assert.ok(
    items.some((item) => item.name === 'persistente'),
    'el dato debe sobrevivir a la peticion, no vivir en la memoria del proceso',
  );
});

// --- Comprobaciones especificas de cada motor ----------------------------

test('users: el dato esta en el archivo SQLite', { skip: onlySqlite }, async () => {
  await withServer(async (base) => {
    await post(base, { name: 'en-disco' });
  });

  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB_FILE);
  const row = db.prepare('SELECT COUNT(*) AS total FROM users').get();
  db.close();

  assert.ok(row.total >= 1, 'la tabla debe contener filas dentro de la base de datos');
  assert.ok(fs.existsSync(DB_FILE), `debe existir el archivo ${DB_FILE}`);
  assert.ok(fs.statSync(DB_FILE).size > 0, 'el archivo no puede estar vacio');
});

test('users: el dato esta en PostgreSQL', { skip: onlyPostgres }, async () => {
  await withServer(async (base) => {
    await post(base, { name: 'en-postgres' });
  });

  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query('SELECT COUNT(*)::int AS total FROM users');
  await client.end();

  assert.ok(result.rows[0].total >= 1, 'la tabla debe contener filas dentro de PostgreSQL');
});
