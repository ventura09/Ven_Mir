'use strict';
// Pruebas del panel web y de su capa de datos. Generado por el sistema multi-agente.
//
// Verifican de verdad el contrato del frontend: que el servidor entrega el panel
// y los estaticos con su tipo correcto, que el salto de directorio esta
// bloqueado y que el cliente de API funciona contra el servidor real.
//
// ALCANCE: no hay navegador en juego. Esto NO comprueba el renderizado visual;
// comprueba el contrato HTTP y la logica de acceso a datos, que es lo que se
// puede verificar sin un navegador.
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const DB_FILE = path.join(__dirname, '..', 'logs', 'test-ui.db');
fs.rmSync(DB_FILE, { force: true });
process.env.STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'sqlite';
process.env.DATABASE_FILE = process.env.DATABASE_FILE || DB_FILE;

const { createServer, closeStores } = require('../server.js');

const API_CLIENT = pathToFileURL(path.join(__dirname, '..', 'public', 'api-client.mjs')).href;
const RESOURCE = 'tasks';

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closeStores();
  fs.rmSync(DB_FILE, { force: true });
});

test('GET / sirve el panel en HTML', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const html = await res.text();
  assert.match(html, /<title>/);
  assert.match(html, /id="create-form"/);
  assert.match(html, /id="item-list"/);
  assert.match(html, /\/app\.mjs/, 'el panel debe cargar el modulo de la interfaz');
});

test('los estaticos se sirven con su tipo MIME correcto', async () => {
  const css = await fetch(`${base}/styles.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);

  const app = await fetch(`${base}/app.mjs`);
  assert.equal(app.status, 200);
  assert.match(app.headers.get('content-type'), /javascript/);

  const client = await fetch(`${base}/api-client.mjs`);
  assert.equal(client.status, 200, 'la capa de datos tambien debe servirse');
});

test('el salto de directorio esta bloqueado', async () => {
  // %2e%2e%2f es "../" codificado: el cliente no lo normaliza, llega al servidor.
  const res = await fetch(`${base}/%2e%2e%2fpackage.json`);
  assert.equal(res.status, 403, 'no debe permitirse leer fuera de public/');
  const body = await res.text();
  assert.ok(!body.includes('"dependencies"'), 'no debe filtrarse el package.json');
});

test('la barra normalizada no filtra archivos de fuera de public/', async () => {
  // Este caso lo normaliza el propio cliente HTTP y acaba en /package.json,
  // que no existe dentro de public/: debe ser 404, nunca 200.
  const res = await fetch(`${base}/../package.json`);
  assert.equal(res.status, 404);
});

test('un estatico inexistente devuelve 404', async () => {
  const res = await fetch(`${base}/no-existe.js`);
  assert.equal(res.status, 404);
});

test('el cliente de API crea, lista y elimina contra el servidor real', async () => {
  const { createApiClient } = await import(API_CLIENT);
  const api = createApiClient(base);

  const health = await api.health();
  assert.equal(health.status, 'ok');

  const created = await api.create(RESOURCE, 'desde-el-panel');
  assert.ok(created.id, 'debe devolver el elemento creado');

  const items = await api.list(RESOURCE);
  assert.ok(items.some((item) => item.name === 'desde-el-panel'), 'la lista debe incluirlo');

  const removed = await api.remove(RESOURCE, created.id);
  assert.equal(removed, true);

  const after = await api.list(RESOURCE);
  assert.ok(!after.some((item) => item.id === created.id), 'ya no debe estar');
});

test('el cliente de API propaga el error del servidor con su codigo', async () => {
  const { createApiClient } = await import(API_CLIENT);
  const api = createApiClient(base);

  await assert.rejects(
    () => api.create(RESOURCE, ''),
    (error) => {
      assert.equal(error.status, 400, 'un nombre vacio es un error del cliente');
      return true;
    },
  );

  await assert.rejects(
    () => api.list('recurso-que-no-existe'),
    (error) => {
      assert.equal(error.status, 404);
      return true;
    },
  );
});
